import { act } from '@testing-library/react'
import { evtmitter, Emitter } from 'evtmitter'
import { useOnEvtmitterEvent } from 'evtmitter/react'

export function emulateAction<T = undefined>() {
  const emitter = evtmitter<{
    action: T
  }>()

  return {
    call(...args: T extends undefined ? [] : [T]) {
      act(() => {
        emitter.emit('action', args[0] as T)
      })
    },
    useOnAction(callback: (value: T) => void) {
      useOnEvtmitterEvent(emitter, 'action', callback)
    },
  }
}

export function emulateActions<T extends Record<string, any>>() {
  const emitters = evtmitter<Record<string, any>>()

  function call(
    ...args: {
      [K in keyof T]: T[K] extends undefined ? [K] : [K, T[K]]
    }[keyof T]
  ) {
    const [key, value] = args

    act(() => {
      emitters.emit(key as string, value)
    })
  }

  function useOnActions(callbacks: {
    [K in keyof T]: (value: T[K]) => void
  }) {
    useOnEvtmitterEvent(emitters, '*', (value, key) => {
      callbacks[key as keyof T](value as T[keyof T])
    })
  }

  return {
    call,
    useOnActions,
  }
}
