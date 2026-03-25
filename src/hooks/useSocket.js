import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../contexts/AuthContext'

const SOCKET_URL = '/api'

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

// Hook — joins family room and listens for data_changed events
export function useFamilySocket(handlers = {}) {
  const { family } = useAuth()
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!family?.id) return
    const s = getSocket()

    s.emit('join_family', family.id)

    const onDataChanged = ({ type }) => {
      const h = handlersRef.current
      if (type === 'expense' && h.onExpense) h.onExpense()
      if (type === 'income'  && h.onIncome)  h.onIncome()
      if (type === 'budget'  && h.onBudget)  h.onBudget()
      if (type === 'tithe'   && h.onTithe)   h.onTithe()
      if (h.onAny) h.onAny(type)
    }

    s.on('data_changed', onDataChanged)
    return () => { s.off('data_changed', onDataChanged) }
  }, [family?.id])
}
