// Turns an uploaded brief, spec or set of meeting notes into plain text the planner can read.

const MAX_CHARS = 20000

const SUPPORTED = ['.txt', '.md', '.csv', '.pdf', '.docx']

const extensionOf = (filename = '') => {
    const dot = filename.lastIndexOf('.')
    return dot === -1 ? '' : filename.slice(dot).toLowerCase()
}

const readPdf = async (buffer) => {
    // pdf-parse v2 exports a class rather than the v1 function.
    const { PDFParse } = require('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()

    // v2 marks page boundaries like "-- 1 of 3 --"; useful in a viewer, noise here.
    return (result.text || '').replace(/--\s*\d+\s*of\s*\d+\s*--/g, '\n')
}

const readDocx = async (buffer) => {
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
}

const extractText = async (file) => {
    if (!file || !file.buffer) throw new Error('No file was received.')

    const ext = extensionOf(file.originalname)
    let text = ''

    if (ext === '.pdf') {
        text = await readPdf(file.buffer)
    } else if (ext === '.docx') {
        text = await readDocx(file.buffer)
    } else if (['.txt', '.md', '.csv'].includes(ext)) {
        text = file.buffer.toString('utf8')
    } else {
        throw new Error(`${ext || 'That file type'} is not supported. Try ${SUPPORTED.join(', ')}.`)
    }

    text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

    if (!text) {
        throw new Error('That file has no readable text in it. A scanned image needs OCR first.')
    }

    return {
        text: text.slice(0, MAX_CHARS),
        truncated: text.length > MAX_CHARS,
        characters: text.length
    }
}

module.exports = { extractText, SUPPORTED, MAX_CHARS }
