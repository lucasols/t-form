import { deepEqual } from 't-state'
import { filterAndMap } from '../../src/utils/arrays'
import { pick } from '../../src/utils/object'

export function createRenderStore() {
  let renders: Record<string, unknown>[] = []
  let rendersTime: number[] = []
  let startTime = Date.now()
  let onNextRender: () => void = () => {}

  function reset(keepLastRender = false) {
    renders = keepLastRender ? [renders.at(-1)!] : []
    rendersTime = []
    startTime = Date.now()
  }

  function add(render: Record<string, unknown>) {
    renders.push(render)
    rendersTime.push(Date.now() - startTime)

    onNextRender()

    if (renders.length > 100) {
      throw new Error('Too many renders')
    }
  }

  function renderCount() {
    return renders.filter((item) => !item._lastSnapshotMark).length
  }

  async function waitNextRender(timeout = 50) {
    return new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        throw new Error('Timeout')
      }, timeout)

      onNextRender = () => {
        clearTimeout(timeoutId)
        resolve()
      }
    })
  }

  function getSnapshot({
    arrays = { firstNItems: 1 },
    changesOnly = false,
    filterKeys,
    includeLastSnapshotEndMark = true,
    splitLongLines = true,
    fromLastSnapshot = false,
  }: {
    arrays?: 'all' | 'firstAndLast' | 'lenght' | { firstNItems: number }
    changesOnly?: boolean
    filterKeys?: string[]
    includeLastSnapshotEndMark?: boolean
    splitLongLines?: boolean
    fromLastSnapshot?: boolean
  } = {}) {
    let rendersToUse = renders

    if (changesOnly || filterKeys) {
      rendersToUse = []

      for (let { item, prev } of arrayWithPrevAndIndex(renders)) {
        if (filterKeys) {
          prev = prev && pick(prev, filterKeys)
          item = pick(item, filterKeys)
        }

        if (!deepEqual(prev, item)) {
          rendersToUse.push(item)
        }
      }
    }

    if (fromLastSnapshot) {
      const lastSnapshotMark = rendersToUse.findLastIndex(
        (item) => item._lastSnapshotMark === true,
      )

      rendersToUse = rendersToUse.slice(clampMin(lastSnapshotMark, 0))
    }

    renders.push({ _lastSnapshotMark: true })

    return `\n${filterAndMap(rendersToUse, (render, ignore, i) => {
      if (render._lastSnapshotMark) {
        if (includeLastSnapshotEndMark && i !== rendersToUse.length - 1) {
          return '---'
        } else {
          return ignore
        }
      }

      let line = ''

      for (const [key, _value] of Object.entries(render)) {
        let value = _value

        if (Array.isArray(value)) {
          if (arrays === 'lenght') {
            value = `Array(${value.length})`
          } else if (arrays === 'firstAndLast' && value.length > 2) {
            const intermediateSize = clampMin(value.length - 2, 0)

            value = [value[0], `...(${intermediateSize} between)`, value.at(-1)]
          } else if (typeof arrays === 'object' && value.length > 2) {
            value = [
              ...value.slice(0, arrays.firstNItems),
              `...(${value.length - arrays.firstNItems} more)`,
            ]
          }
        }

        if (value === '') {
          value = `''`
        }

        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value).replace(/"/g, '').replace(/,/g, ', ')
        }

        line += `${key}: ${value} -- `
      }

      line = line.slice(0, -4)

      if (splitLongLines && line.length > 80) {
        const parts = line.split(' -- ')

        if (parts.length === 1) {
          return line
        }

        line = ''

        for (const { item, index } of arrayWithPrevAndIndex(parts)) {
          if (index === 0) {
            line += '┌─\n⎢ '
          } else if (index === parts.length - 1) {
            line += '⎢ '
          } else {
            line += '⎢ '
          }

          line += `${item}\n`

          if (index === parts.length - 1) {
            line += '└─'
          }
        }
      }

      return line
    }).join('\n')}\n`
  }

  return {
    add,
    reset,
    getSnapshot,
    waitNextRender,
    get changesSnapshot() {
      return getSnapshot({ changesOnly: true })
    },
    get snapshot() {
      return getSnapshot({ changesOnly: false })
    },
    get snapshotFromLast() {
      return getSnapshot({ fromLastSnapshot: true })
    },
    renderCount,
    get rendersTime() {
      return rendersTime
    },
  }
}

function arrayWithPrevAndIndex<T>(
  array: T[],
): { item: T; prev: T | null; index: number }[] {
  return array.map((item, i) => ({
    item,
    prev: array[i - 1] ?? null,
    index: i,
  }))
}

function clampMin(value: number, min: number) {
  return value < min ? min : value
}
