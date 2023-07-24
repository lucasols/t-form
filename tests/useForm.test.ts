import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { evtmitter } from '../src/evtmitter'
import { useOnEvtmitterEvent } from '../src/react'

afterEach(() => cleanup())

describe('useOnEvtmitterEvent()', () => {
  test('subscribe to single event', () => {
    const spy = vi.fn()

    const emitter = evtmitter<{ foo: string }>()

    renderHook(() =>
      useOnEvtmitterEvent(emitter, 'foo', (payload, type) => {
        spy(payload, type)
      }),
    )

    emitter.emit('foo', 'bar')

    expect(spy).toBeCalledWith('bar', 'foo')
  })

  test('unsubscribe when unmounted', () => {
    const spy = vi.fn()

    const emitter = evtmitter<{ foo: string }>()

    const { unmount } = renderHook(() =>
      useOnEvtmitterEvent(emitter, 'foo', (payload, type) => {
        spy(payload, type)
      }),
    )

    unmount()

    emitter.emit('foo', 'bar')

    expect(spy).not.toBeCalled()
  })

  test('disabled', () => {
    const spy = vi.fn()

    const emitter = evtmitter<{ foo: string }>()

    const { rerender } = renderHook(
      ({ enabled = false }: { enabled?: boolean } = {}) => {
        return useOnEvtmitterEvent(
          emitter,
          'foo',
          (payload, type) => {
            spy(payload, type)
          },
          {
            disabled: !enabled,
          },
        )
      },
    )

    emitter.emit('foo', 'bar')

    expect(spy).not.toBeCalled()

    rerender({ enabled: true })

    emitter.emit('foo', 'bar')
    expect(spy).toHaveBeenLastCalledWith('bar', 'foo')
    expect(spy).toHaveBeenCalledTimes(1)

    rerender({ enabled: false })

    emitter.emit('foo', 'bar')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('multiple events', () => {
    const spy = vi.fn()

    const emitter = evtmitter<{ foo: string; bar: number }>()

    renderHook(() =>
      useOnEvtmitterEvent(emitter, ['foo', 'bar'], (payload, type) => {
        spy(payload, type)
      }),
    )

    emitter.emit('foo', 'bar')
    expect(spy).toHaveBeenLastCalledWith('bar', 'foo')

    emitter.emit('bar', 123)
    expect(spy).toHaveBeenLastCalledWith(123, 'bar')
  })

  test('event handler scope is updated on rerender', () => {
    const spy = vi.fn()

    const emitter = evtmitter<{ foo: string }>()

    const { rerender } = renderHook(
      ({ enabled = false }: { enabled?: boolean } = {}) => {
        useOnEvtmitterEvent(emitter, 'foo', (payload, type) => {
          if (enabled) {
            spy(payload, type)
          }
        })
      },
    )

    emitter.emit('foo', 'bar')

    expect(spy).not.toBeCalled()

    rerender({ enabled: true })

    emitter.emit('foo', 'bar')
    expect(spy).toHaveBeenLastCalledWith('bar', 'foo')
    expect(spy).toHaveBeenCalledTimes(1)

    rerender({ enabled: false })

    emitter.emit('foo', 'bar')
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
