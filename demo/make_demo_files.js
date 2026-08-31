// Builds a .pdf and a .docx from a Markdown brief in this folder.

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const here = __dirname
const basename = (process.argv[2] || 'project_brief').replace(/\.md$/i, '')
const markdown = fs.readFileSync(path.join(here, `${basename}.md`), 'utf8')

// Strip the Markdown marks; the point is the words, not the formatting.
const lines = markdown
    .split('\n')
    .map(line => line.replace(/^#{1,6}\s+/, '').replace(/^-\s+/, '- ').trimEnd())

// --- PDF --------------------------------------------------------------------

// The font below is declared /WinAnsiEncoding.
const WIN_ANSI = {
    '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
    'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E,
    '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
    '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F
}

const toWinAnsi = (text) => Array.from(text).map(char => {
    const code = char.codePointAt(0)
    if (code <= 0xFF) return char
    if (WIN_ANSI[char]) return String.fromCharCode(WIN_ANSI[char])
    return '?'
}).join('')

const escapePdf = (text) =>
    toWinAnsi(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

const buildPdf = (allLines) => {
    const perPage = 46
    const pages = []
    for (let i = 0; i < allLines.length; i += perPage) pages.push(allLines.slice(i, i + perPage))

    const objects = []
    const pageIds = pages.map((_, index) => 4 + index * 2)

    objects.push('<</Type/Catalog/Pages 2 0 R>>')
    objects.push(`<</Type/Pages/Kids[${pageIds.map(id => `${id} 0 R`).join(' ')}]/Count ${pages.length}>>`)
    objects.push('<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>')

    for (const page of pages) {
        const body = page
            .map((line, index) => `BT /F1 11 Tf 56 ${760 - index * 16} Td (${escapePdf(line)}) Tj ET`)
            .join('\n')

        objects.push('<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 3 0 R>>>>/Contents PLACEHOLDER 0 R>>')
        objects.push(`<</Length ${body.length}>>\nstream\n${body}\nendstream`)
    }

    // Point each page at the content object that follows it.
    let contentId = 5
    for (let i = 0; i < objects.length; i += 1) {
        if (objects[i].includes('PLACEHOLDER')) {
            objects[i] = objects[i].replace('PLACEHOLDER', String(contentId))
            contentId += 2
        }
    }

    let pdf = '%PDF-1.4\n'
    const offsets = []

    objects.forEach((body, index) => {
        offsets.push(pdf.length)
        pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
    })

    const xref = pdf.length
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
    pdf += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`

    return Buffer.from(pdf, 'latin1')
}

// DOCX ------------------------------------------------------------------- A .docx is a ZIP.

const crc32Table = (() => {
    const table = new Int32Array(256)
    for (let i = 0; i < 256; i += 1) {
        let c = i
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
        table[i] = c
    }
    return table
})()

const crc32 = (buffer) => {
    let crc = -1
    for (const byte of buffer) crc = (crc >>> 8) ^ crc32Table[(crc ^ byte) & 0xFF]
    return (crc ^ -1) >>> 0
}

const zip = (entries) => {
    const chunks = []
    const central = []
    let offset = 0

    for (const { name, data } of entries) {
        const nameBuf = Buffer.from(name, 'utf8')
        const compressed = zlib.deflateRawSync(data)
        const sum = crc32(data)

        const local = Buffer.alloc(30)
        local.writeUInt32LE(0x04034b50, 0)
        local.writeUInt16LE(20, 4)       // version needed
        local.writeUInt16LE(0, 6)        // flags
        local.writeUInt16LE(8, 8)        // deflate
        local.writeUInt32LE(0, 10)       // time+date
        local.writeUInt32LE(sum, 14)
        local.writeUInt32LE(compressed.length, 18)
        local.writeUInt32LE(data.length, 22)
        local.writeUInt16LE(nameBuf.length, 26)
        local.writeUInt16LE(0, 28)

        chunks.push(local, nameBuf, compressed)

        const entry = Buffer.alloc(46)
        entry.writeUInt32LE(0x02014b50, 0)
        entry.writeUInt16LE(20, 4)
        entry.writeUInt16LE(20, 6)
        entry.writeUInt16LE(0, 8)
        entry.writeUInt16LE(8, 10)
        entry.writeUInt32LE(0, 12)
        entry.writeUInt32LE(sum, 16)
        entry.writeUInt32LE(compressed.length, 20)
        entry.writeUInt32LE(data.length, 24)
        entry.writeUInt16LE(nameBuf.length, 28)
        entry.writeUInt32LE(offset, 42)  // where this entry's local header starts
        central.push(Buffer.concat([entry, nameBuf]))

        offset += local.length + nameBuf.length + compressed.length
    }

    const centralBuf = Buffer.concat(central)
    const end = Buffer.alloc(22)
    end.writeUInt32LE(0x06054b50, 0)
    end.writeUInt16LE(entries.length, 8)
    end.writeUInt16LE(entries.length, 10)
    end.writeUInt32LE(centralBuf.length, 12)
    end.writeUInt32LE(offset, 16)

    return Buffer.concat([...chunks, centralBuf, end])
}

const escapeXml = (text) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const buildDocx = (allLines) => {
    const paragraphs = allLines
        .map(line => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
        .join('')

    const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`

    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`

    return zip([
        { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
        { name: '_rels/.rels', data: Buffer.from(rels, 'utf8') },
        { name: 'word/document.xml', data: Buffer.from(document, 'utf8') }
    ])
}

// --- Write ------------------------------------------------------------------

const pdfPath = path.join(here, `${basename}.pdf`)
const docxPath = path.join(here, `${basename}.docx`)

fs.writeFileSync(pdfPath, buildPdf(lines))
fs.writeFileSync(docxPath, buildDocx(lines))

console.log('Wrote:')
console.log(`  ${basename}.pdf `, fs.statSync(pdfPath).size, 'bytes')
console.log(`  ${basename}.docx`, fs.statSync(docxPath).size, 'bytes')
