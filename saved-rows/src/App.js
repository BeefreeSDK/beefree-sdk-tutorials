/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import BeeFreeSDK from '@beefree.io/sdk'
import { useBackend, useContentDialog } from './hooks'
import { Modal } from './components'
import { SaveRow } from './components/ContentDialogs'
import './App.css'

const App = () => {
  // Hooks
  const { config, asyncModal } = useContentDialog()
  const {
    template, saveTemplate, saveRow, getRows, handleDeleteRow, handleEditRow,
  } = useBackend()

  // LOCAL STATE
  const [currentTemplate] = useState(template)

  // CALLBACKS
  const handleOnSave = async (template) => {
    await saveTemplate(JSON.parse(template))
  }

  const handleOnSaveRow = async (rowTemplate) => {
    const row = JSON.parse(rowTemplate)
    saveRow(row)
  }

  const handleOnChange = async (template) => {
    await saveTemplate(JSON.parse(template))
  }

  // HOOKS
  const handleGetRows = async (resolve, reject, args) => {
    const rows = await getRows(args.handle)
    resolve(rows)
  }

  // CONTENT DIALOG HANDLERS
  const handleSaveRow = async (resolve, reject, row) => {
    // Save New Row
    const { name = '', synced = false } = await asyncModal(SaveRow, row)
    if (name) {
      resolve({ name, guid: row?.metadata?.guid ?? uuidv4() }, { synced })
    }
    reject('')
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
    uid: 'saved-rows-demo-uid',
    container: 'beefree-sdk-container',
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
      <Modal config={config} />
    </main>
  )
}

export default App
