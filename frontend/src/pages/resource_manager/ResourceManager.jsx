import { useEffect, useMemo, useState } from 'react'
import './ResourceManager.css'

import { API_BASE } from '../../lib/api_base'

const API = `${API_BASE}/api/resources`

function ResourceManager({ role }) {
  const [resources, setResources] =
    useState([])

  const [currentFolder, setCurrentFolder] =
    useState(null)

  const [search, setSearch] =
    useState('')

  const [type, setType] =
    useState('all')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [modal, setModal] =
    useState(null)

  const [selectedResource, setSelectedResource] =
    useState(null)

  const isAdmin =
    role === 'admin'

  const apiHeaders = useMemo(
    () => ({
      'Content-Type':
        'application/json',
    }),
    []
  )

  async function loadResources() {
    try {
      setLoading(true)
      setError('')

      const params =
        new URLSearchParams()

      params.set(
        'role',
        role
      )

      params.set(
        'parentId',
        currentFolder?._id ||
          'root'
      )

      if (search.trim()) {
        params.set(
          'search',
          search.trim()
        )
      }

      if (type !== 'all') {
        params.set(
          'type',
          type
        )
      }

      const response =
        await fetch(
          `${API}?${params.toString()}`
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Failed to load resources'
        )
      }

      setResources(
        data.resources || []
      )
    } catch (err) {
      setError(
        err.message ||
        'Failed to load resources'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResources()
  }, [
    role,
    search,
    type,
    currentFolder?._id,
  ])

  function openResource(resource) {
    if (
      resource.type ===
      'folder'
    ) {
      setCurrentFolder(
        resource
      )

      setSearch('')
      setType('all')

      return
    }

    if (
      resource.type ===
      'link'
    ) {
      window.open(
        resource.url,
        '_blank',
        'noopener,noreferrer'
      )

      return
    }

    window.open(
      `${API}/${resource._id}/download?role=${role}`,
      '_blank'
    )
  }

  function iconFor(resource) {
    if (
      resource.type ===
      'folder'
    ) {
      return '📁'
    }

    if (
      resource.type ===
      'link'
    ) {
      return '🔗'
    }

    const name =
      resource.name.toLowerCase()

    if (
      name.endsWith('.pdf')
    ) {
      return '📕'
    }

    if (
      name.endsWith('.doc') ||
      name.endsWith('.docx')
    ) {
      return '📘'
    }

    if (
      name.endsWith('.ppt') ||
      name.endsWith('.pptx')
    ) {
      return '📙'
    }

    if (
      name.endsWith('.xls') ||
      name.endsWith('.xlsx')
    ) {
      return '📗'
    }

    return '📄'
  }

  async function deleteResource(
    resource
  ) {
    const confirmed =
      window.confirm(
        `Delete "${resource.name}"?`
      )

    if (!confirmed) {
      return
    }

    try {
      const response =
        await fetch(
          `${API}/${resource._id}`,
          {
            method: 'DELETE',
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Delete failed'
        )
      }

      await loadResources()
    } catch (err) {
      setError(
        err.message ||
        'Delete failed'
      )
    }
  }

  return (
    <div className="resource-page">

      <header className="resource-header">

        <div>
          <div className="resource-eyebrow">
            {isAdmin
              ? 'ADMIN RESOURCE CENTER'
              : 'EMPLOYEE RESOURCE CENTER'}
          </div>

          <h1>
            {isAdmin
              ? 'Manage Resources'
              : 'Company Resources'}
          </h1>

          <p>
            {isAdmin
              ? 'Upload, organize and control company resources.'
              : 'Find the files, folders and links shared with employees.'}
          </p>
        </div>

        <div
          className={`role-pill ${
            isAdmin
              ? 'admin'
              : 'employee'
          }`}
        >
          {role}
        </div>

      </header>

      <section className="resource-toolbar">

        <div className="search-box">
          <span>⌕</span>

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search resources..."
          />
        </div>

        <select
          value={type}
          onChange={(event) =>
            setType(
              event.target.value
            )
          }
        >
          <option value="all">
            All types
          </option>

          <option value="file">
            Files
          </option>

          <option value="folder">
            Folders
          </option>

          <option value="link">
            Links
          </option>
        </select>

        {isAdmin && (
          <div className="admin-actions">

            <button
              onClick={() =>
                setModal('upload')
              }
            >
              + Upload
            </button>

            <button
              onClick={() =>
                setModal('folder')
              }
            >
              + Folder
            </button>

            <button
              onClick={() =>
                setModal('link')
              }
            >
              + Link
            </button>

          </div>
        )}

      </section>

      {currentFolder && (
        <div className="breadcrumb">

          <button
            onClick={() =>
              setCurrentFolder(null)
            }
          >
            Resources
          </button>

          <span>/</span>

          <strong>
            {currentFolder.name}
          </strong>

        </div>
      )}

      {error && (
        <div className="resource-error">
          {error}
        </div>
      )}

      <main className="resource-grid">

        {loading ? (
          <div className="empty-state">
            Loading resources...
          </div>
        ) : resources.length === 0 ? (
          <div className="empty-state">

            <div className="empty-icon">
              🗂️
            </div>

            <h3>
              No resources found
            </h3>

            <p>
              Try another search or filter.
            </p>

          </div>
        ) : (
          resources.map(
            (resource) => (
              <article
                className="resource-card"
                key={
                  resource._id
                }
              >

                <button
                  className="resource-main"
                  onClick={() =>
                    openResource(
                      resource
                    )
                  }
                >

                  <div className="resource-icon">
                    {iconFor(
                      resource
                    )}
                  </div>

                  <div className="resource-info">

                    <strong
                      title={
                        resource.name
                      }
                    >
                      {resource.name}
                    </strong>

                    <span>
                      {resource.type}

                      {resource.size
                        ? ` • ${(
                            resource.size /
                            1024 /
                            1024
                          ).toFixed(
                            2
                          )} MB`
                        : ''}
                    </span>

                  </div>

                </button>

                {isAdmin && (
                  <div className="resource-menu">

                    <button
                      title="Access"
                      onClick={() => {
                        setSelectedResource(
                          resource
                        )

                        setModal(
                          'access'
                        )
                      }}
                    >
                      🔐
                    </button>

                    <button
                      title="Delete"
                      onClick={() =>
                        deleteResource(
                          resource
                        )
                      }
                    >
                      ⋮
                    </button>

                  </div>
                )}

              </article>
            )
          )
        )}

      </main>

      {modal ===
        'upload' && (
        <UploadModal
          parentId={
            currentFolder?._id ||
            null
          }
          onClose={() =>
            setModal(null)
          }
          onDone={
            loadResources
          }
        />
      )}

      {modal ===
        'folder' && (
        <FolderModal
          parentId={
            currentFolder?._id ||
            null
          }
          onClose={() =>
            setModal(null)
          }
          onDone={
            loadResources
          }
        />
      )}

      {modal ===
        'link' && (
        <LinkModal
          parentId={
            currentFolder?._id ||
            null
          }
          onClose={() =>
            setModal(null)
          }
          onDone={
            loadResources
          }
        />
      )}

      {modal ===
        'access' &&
        selectedResource && (
        <AccessModal
          resource={
            selectedResource
          }
          onClose={() => {
            setModal(null)
            setSelectedResource(
              null
            )
          }}
          onDone={
            loadResources
          }
        />
      )}

    </div>
  )
}

// ============================================================================
// MODAL
// ============================================================================

function Modal({
  title,
  children,
  onClose,
}) {
  return (
    <div className="modal-backdrop">

      <div className="resource-modal">

        <div className="modal-title">

          <h2>{title}</h2>

          <button
            onClick={onClose}
          >
            ×
          </button>

        </div>

        {children}

      </div>

    </div>
  )
}

// ============================================================================
// ACCESS SELECTOR
// ============================================================================

function AccessSelector({
  value,
  setValue,
}) {
  function toggleRole(
    role
  ) {
    setValue(
      (old) => ({
        ...old,

        roles:
          old.roles.includes(
            role
          )
            ? old.roles.filter(
                (item) =>
                  item !== role
              )
            : [
                ...old.roles,
                role,
              ],
      })
    )
  }

  return (
    <div className="access-box">

      <label>
        Accessibility
      </label>

      <div className="access-options">

        <label>
          <input
            type="checkbox"
            checked={value.roles.includes(
              'employee'
            )}
            onChange={() =>
              toggleRole(
                'employee'
              )
            }
          />

          Employees
        </label>

        <label>
          <input
            type="checkbox"
            checked={value.roles.includes(
              'admin'
            )}
            onChange={() =>
              toggleRole(
                'admin'
              )
            }
          />

          Admins
        </label>

      </div>

    </div>
  )
}

// ============================================================================
// UPLOAD MODAL
// ============================================================================

function UploadModal({
  parentId,
  onClose,
  onDone,
}) {
  const [file, setFile] =
    useState(null)

  const [access, setAccess] =
    useState({
      roles: [
        'employee',
      ],
      users: [],
    })

  const [saving, setSaving] =
    useState(false)

  async function submit(
    event
  ) {
    event.preventDefault()

    if (!file) {
      return
    }

    try {
      setSaving(true)

      const form =
        new FormData()

      form.append(
        'file',
        file
      )

      form.append(
        'parentId',
        parentId || ''
      )

      form.append(
        'access',
        JSON.stringify(
          access
        )
      )

      const response =
        await fetch(
          `${API}/upload`,
          {
            method: 'POST',
            body: form,
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Upload failed'
        )
      }

      onClose()
      await onDone()
    } catch (error) {
      window.alert(
        error.message
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Upload file"
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={submit}
      >

        <input
          type="file"
          required
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp,.zip"
          onChange={(event) =>
            setFile(
              event.target.files?.[0] ||
              null
            )
          }
        />

        <AccessSelector
          value={access}
          setValue={setAccess}
        />

        <button
          className="primary-button"
          disabled={
            saving
          }
        >
          {saving
            ? 'Uploading...'
            : 'Upload file'}
        </button>

      </form>
    </Modal>
  )
}

// ============================================================================
// FOLDER MODAL
// ============================================================================

function FolderModal({
  parentId,
  onClose,
  onDone,
}) {
  const [name, setName] =
    useState('')

  const [access, setAccess] =
    useState({
      roles: [
        'employee',
      ],
      users: [],
    })

  async function submit(
    event
  ) {
    event.preventDefault()

    const response =
      await fetch(
        `${API}/folders`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            name,
            parentId,
            access,
          }),
        }
      )

    const data =
      await response.json()

    if (!response.ok) {
      return window.alert(
        data.message ||
        'Could not create folder'
      )
    }

    onClose()
    await onDone()
  }

  return (
    <Modal
      title="Create folder"
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={submit}
      >

        <input
          required
          value={name}
          onChange={(event) =>
            setName(
              event.target.value
            )
          }
          placeholder="Folder name"
        />

        <AccessSelector
          value={access}
          setValue={setAccess}
        />

        <button className="primary-button">
          Create folder
        </button>

      </form>
    </Modal>
  )
}

// ============================================================================
// LINK MODAL
// ============================================================================

function LinkModal({
  parentId,
  onClose,
  onDone,
}) {
  const [form, setForm] =
    useState({
      name: '',
      url: '',
      description: '',
    })

  const [access, setAccess] =
    useState({
      roles: [
        'employee',
      ],
      users: [],
    })

  async function submit(
    event
  ) {
    event.preventDefault()

    const response =
      await fetch(
        `${API}/links`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            ...form,
            parentId,
            access,
          }),
        }
      )

    const data =
      await response.json()

    if (!response.ok) {
      return window.alert(
        data.message ||
        'Could not create link'
      )
    }

    onClose()
    await onDone()
  }

  return (
    <Modal
      title="Add link"
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={submit}
      >

        <input
          required
          placeholder="Display name"
          value={
            form.name
          }
          onChange={(event) =>
            setForm({
              ...form,
              name:
                event.target.value,
            })
          }
        />

        <input
          required
          type="url"
          placeholder="https://..."
          value={
            form.url
          }
          onChange={(event) =>
            setForm({
              ...form,
              url:
                event.target.value,
            })
          }
        />

        <textarea
          placeholder="Description"
          value={
            form.description
          }
          onChange={(event) =>
            setForm({
              ...form,
              description:
                event.target.value,
            })
          }
        />

        <AccessSelector
          value={access}
          setValue={setAccess}
        />

        <button className="primary-button">
          Add link
        </button>

      </form>
    </Modal>
  )
}

// ============================================================================
// ACCESS MODAL
// ============================================================================

function AccessModal({
  resource,
  onClose,
  onDone,
}) {
  const [access, setAccess] =
    useState({
      roles:
        resource.access
          ?.roles || [],
      users:
        resource.access
          ?.users || [],
    })

  async function save() {
    const response =
      await fetch(
        `${API}/${resource._id}/access`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(
            access
          ),
        }
      )

    const data =
      await response.json()

    if (!response.ok) {
      return window.alert(
        data.message ||
        'Could not update access'
      )
    }

    onClose()
    await onDone()
  }

  return (
    <Modal
      title={`Access: ${resource.name}`}
      onClose={onClose}
    >

      <AccessSelector
        value={access}
        setValue={setAccess}
      />

      <button
        className="primary-button"
        onClick={save}
      >
        Save access
      </button>

    </Modal>
  )
}

export default ResourceManager
