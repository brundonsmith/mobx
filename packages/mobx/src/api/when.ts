import {
    $mobx,
    IReactionDisposer,
    Lambda,
    autorun,
    createAction,
    getNextId,
    die,
    allowStateChanges
} from "../internal.ts"

export interface IWhenOptions {
    name?: string
    timeout?: number
    onError?: (error: any) => void
}

export function when(
    predicate: () => boolean,
    opts?: IWhenOptions
): Promise<void> & { cancel(): void }
export function when(
    predicate: () => boolean,
    effect: Lambda,
    opts?: IWhenOptions
): IReactionDisposer
export function when(predicate: any, arg1?: any, arg2?: any): any {
    if (arguments.length === 1 || (arg1 && typeof arg1 === "object"))
        return whenPromise(predicate, arg1)
    return _when(predicate, arg1, arg2 || {})
}

function _when(predicate: () => boolean, effect: Lambda, opts: IWhenOptions): IReactionDisposer {
    let timeoutHandle: any
    if (typeof opts.timeout === "number") {
        const error = new Error("WHEN_TIMEOUT")
        timeoutHandle = setTimeout(() => {
            if (!disposer[$mobx].isDisposed_) {
                disposer()
                if (opts.onError) opts.onError(error)
                else throw error
            }
        }, opts.timeout)
    }

    opts.name = __DEV__ ? opts.name || "When@" + getNextId() : "When"
    const effectAction = createAction(
        __DEV__ ? opts.name + "-effect" : "When-effect",
        effect as Function
    )
    // eslint-disable-next-line
    var disposer = autorun(r => {
        // predicate should not change state
        let cond = allowStateChanges(false, predicate)
        if (cond) {
            r.dispose()
            if (timeoutHandle) clearTimeout(timeoutHandle)
            effectAction()
        }
    }, opts)
    return disposer
}

function whenPromise(
    predicate: () => boolean,
    opts?: IWhenOptions
): Promise<void> & { cancel(): void } {
    if (__DEV__ && opts && opts.onError)
        return die(`the options 'onError' and 'promise' cannot be combined`)
    let cancel
    const res = new Promise((resolve, reject) => {
        let disposer = _when(predicate, resolve, { ...opts, onError: reject })
        cancel = () => {
            disposer()
            reject("WHEN_CANCELLED")
        }
    })
    ;(res as any).cancel = cancel
    return res as any
}
