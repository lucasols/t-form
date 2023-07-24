type EventType = string

type OffFn = () => void

export type MultipleTypesHandler<E extends Record<EventType, unknown>> = (
  ...args: {
    [T in keyof E]: [paylod: E[T], type: T]
  }[keyof E]
) => void

type Handler<E extends Record<EventType, unknown>, T extends keyof E> = (
  payload: E[T],
  type: T,
) => void

export type Emitter<Events extends Record<EventType, unknown>> = {
  on(type: '*', handler: MultipleTypesHandler<Events>): OffFn
  on<Types extends keyof Events>(
    types: Types[],
    handler: MultipleTypesHandler<Pick<Events, Types>>,
  ): OffFn
  on<Type extends keyof Events>(
    type: Type,
    handler: Handler<Events, Type>,
  ): OffFn

  emit<Type extends keyof Events>(type: Type, arg: Events[Type]): void
  emit<Type extends keyof Events>(
    type: undefined extends Events[Type] ? Type : never,
  ): void

  off<Type extends keyof Events>(
    type: Type,
    handler?: Handler<Events, Type>,
  ): void
  off(type: '*'): void
  off<Types extends keyof Events>(
    types: Types[],
    handler?: MultipleTypesHandler<Pick<Events, Types>>,
  ): void

  once<Type extends keyof Events>(
    type: Type,
    handler: Handler<Events, Type>,
  ): OffFn
  once(type: '*', handler: MultipleTypesHandler<Events>): OffFn
  once<Types extends keyof Events>(
    types: Types[],
    handler: MultipleTypesHandler<Pick<Events, Types>>,
  ): OffFn
}

export function evtmitter<
  Events extends Record<EventType, unknown>,
>(): Emitter<Events> {
  type InternalHandler = (payload: any, type: EventType) => void

  const listeners = new Map<EventType, Set<InternalHandler>>()

  function on(type: EventType | EventType[], handler: InternalHandler): OffFn {
    if (Array.isArray(type)) {
      const removeFns = type.map((t) => on(t, handler))

      return () => {
        for (const remove of removeFns) {
          remove()
        }
      }
    } else {
      const handlers = mapGetOrInsert(listeners, type, () => new Set([handler]))

      handlers.add(handler)

      return () => {
        off(type, handler)
      }
    }
  }

  function once(
    type: EventType | EventType[],
    handler: InternalHandler,
  ): OffFn {
    const remove = on(type, (payload, evtType) => {
      handler(payload, evtType)
      remove()
    })

    return remove
  }

  function emit(_type: keyof Events, payload?: any): void {
    const type = _type as EventType
    const handlers = listeners.get(type)

    if (handlers) {
      for (const handler of handlers) {
        handler(payload, type)
      }
    }

    const wildcardHandlers = listeners.get('*')

    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        handler(payload, type)
      }
    }
  }

  function off(type: EventType | EventType[] | '*', handler?: InternalHandler) {
    if (Array.isArray(type)) {
      for (const t of type) {
        off(t, handler)
      }
    } else {
      if (type === '*') {
        listeners.clear()
        return
      }

      const handlers = listeners.get(type)

      if (handlers) {
        if (handler) {
          handlers.delete(handler)
        } else {
          handlers.clear()
        }
      }
    }
  }

  return {
    on,
    emit,
    off,
    once,
  }
}

/** Get a value from a Map(), or insert a new value if it doesn't exist. */
export function mapGetOrInsert<K, T, F extends T = T>(
  map: Map<K, T>,
  key: K,
  fallback: () => F,
): T {
  if (!map.has(key)) {
    map.set(key, fallback())
  }

  return map.get(key)!
}
