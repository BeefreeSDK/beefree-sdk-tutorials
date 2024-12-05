/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import BeeFreeSDK from '@beefree.io/sdk'
import { useBackend, useContentDialog } from './hooks'
import { Modal, Loader, Toolbar } from './components'
import { SaveRow, EditSyncedRow, SaveSyncedRow } from './components/ContentDialogs'
import './App.css'

const App = () => {
  // Hooks
  const { config, asyncModal } = useContentDialog()
  const {
    csapiMerge, template, saveTemplate, saveRow, getRows, handleDeleteRow, handleEditRow, getRowTemplate,
  } = useBackend()

  // LOCAL STATE
  const [currentTemplate, setCurrentTemplate] = useState(template)
  const [editSingleRow, setEditSingleRow] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // UTILS
  const syncTemplates = async (row) => {
    setIsLoading(true)
    setEditSingleRow(false)
    const syncedTemplate = await csapiMerge(template, row)
    setCurrentTemplate(prevTemplate => syncedTemplate || prevTemplate)
    setIsLoading(false)
  }

  // CALLBACKS
  const handleOnSave = async (template) => {
    await saveTemplate(JSON.parse(template))
  }

  const handleOnSaveRow = async (rowTemplate) => {
    const row = JSON.parse(rowTemplate)
    // Synced Row
    if (editSingleRow) {
      row.synced = true // Override synced property
      syncTemplates(row)
    }
    saveRow(row)
  }

  const handleOnChange = async (template) => {
    if (!editSingleRow) {
      await saveTemplate(JSON.parse(template))
    }
  }

  // HOOKS
  const handleGetRows = async (resolve, reject, args) => {
    const rows = await getRows(args.handle)
    resolve(rows)
  }

  // CONTENT DIALOG HANDLERS
  const handleEditSyncedRow = async (resolve, reject, row) => {
    // Open content dialog "Edit Synced Row Component" - passing it the row
    const { synced } = await asyncModal(EditSyncedRow, row)
    if (synced === true) {
      // Reload builder with the row, in edit single row mode
      setEditSingleRow(true)
      setCurrentTemplate(getRowTemplate(row))
      resolve(true)
    } else if (synced === false) {
      // User selected a standard row
      resolve(false)
    } else {
      // User clicked the [X] button
      resolve(true)
    }
  }

  const handleSaveRow = async (resolve, reject, row) => {
    if (editSingleRow) {
      // Save Existing Synced Row
      resolve(row.metadata, { synced: true })
    } else {
      // Save New Row
      const { name = '', synced = false } = await asyncModal(SaveSyncedRow, row)
      if (name) {
        resolve({ name, guid: row?.metadata?.guid ?? uuidv4() }, { synced })
      }
      reject('')
    }
  }

  const handleOnDeleteRow = async (resolve, reject, { row }) => {
    if (!row) return
    await handleDeleteRow(row)
    resolve(true)
  }

  const handleOnEditRow = async (resolve, reject, { row }) => {
    if (!row) return
    const { name = '' } = await asyncModal(SaveRow, row)
    if (name) {
      await handleEditRow(row, name)
      resolve(true)
    } else {
      reject('')
    }
  }

  // CONFIGURATION
  const contentDialog = {
    editSyncedRow: {
      label: 'Edit synced row',
      description: 'This row is used in other designs. You can decide to update all the designs or transform this single row into a regular one',
      notPermittedDescription: 'Your plan does not permit you to edit it. Please contact your account administrator',
      handler: handleEditSyncedRow,
    },
    saveRow: {
      handler: handleSaveRow,
    },
    onDeleteRow: {
      handler: handleOnDeleteRow,
    },
    onEditRow: {
      handler: handleOnEditRow,
    }
  }

  const rowsConfiguration = {
    emptyRows: true,
    defaultRows: false,
    externalContentURLs: [{
      name: "Saved Rows",
      value: "saved-rows",
      handle: 'saved-rows',
      isLocal: true,
      behaviors: { canEdit: true, canDelete: true },
    }]
  }

  const hooks = {
    getRows: {
      handler: handleGetRows
    }
  }

  const clientConfig = {
    uid: 'synced-rows-demo-uid',
    container: 'beefree-sdk-container',
    workspace: { editSingleRow },
    saveRows: true,
    onSave: handleOnSave,
    onSaveRow: handleOnSaveRow,
    onChange: handleOnChange,
    rowsConfiguration,
    hooks,
    contentDialog,
    loadingSpinnerDisableOnSave: false,
    loadingSpinnerDisableOnDialog: true,
  }

  // SDK INIT
  const initializeBeeFreeSDK = async () => {
    const clientId = `${process.env.REACT_APP_CLIENT_ID}`
    const clientSecret = `${process.env.REACT_APP_SECRET_KEY}`

    const sdk = new BeeFreeSDK()
    await sdk.getToken(clientId, clientSecret)
    sdk.start(clientConfig, currentTemplate)
  }

  useEffect(() => {
    initializeBeeFreeSDK()
  }, [currentTemplate])

  return (
    <main className="App">
      <section id="beefree-sdk-container" />
      <Loader isLoading={isLoading} />
      <Modal config={config} />
      <Toolbar />
    </main>
  )
}

export default App
