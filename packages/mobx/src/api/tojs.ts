import {
    isObservable,
    isObservableArray,
    isObservableValue,
    isObservableMap,
    isObservableSet,
    isComputedValue,
    die,
    apiOwnKeys,
    objectPrototype
} from "../internal.ts"

function cache<K, V>(map: Map<any, any>, key: K, value: V): V {
    map.set(key, value)
    return value
}

function toJSHelper(source, __alreadySeen: Map<any, any>) {
    if (
        source == null ||
        typeof source !== "object" ||
        source instanceof Date ||
        !isObservable(source)
    )
        return source

    if (isObservableValue(source) || isComputedValue(source))
        return toJSHelper(source.get(), __alreadySeen)
    if (__alreadySeen.has(source)) {
        return __alreadySeen.get(source)
    }
    if (isObservableArray(source)) {
        const res = cache(__alreadySeen, source, new Array(source.length))
        source.forEach((value, idx) => {
            res[idx] = toJSHelper(value, __alreadySeen)
        })
        return res
    }
    if (isObservableSet(source)) {
        const res = cache(__alreadySeen, source, new Set())
        source.forEach(value => {
            res.add(toJSHelper(value, __alreadySeen))
        })
        return res
    }
    if (isObservableMap(source)) {
        const res = cache(__alreadySeen, source, new Map())
        source.forEach((value, key) => {
            res.set(key, toJSHelper(value, __alreadySeen))
        })
        return res
    } else {
        // must be observable object
        const res = cache(__alreadySeen, source, {})
        apiOwnKeys(source).forEach((key: any) => {
            if (objectPrototype.propertyIsEnumerable.call(source, key)) {
                res[key] = toJSHelper(source[key], __alreadySeen)
            }
        })
        return res
    }
}

/**
 * Basically, a deep clone, so that no reactive property will exist anymore.
 */
export function toJS<T>(source: T, options?: any): T {
    if (__DEV__ && options) die("toJS no longer supports options")
    return toJSHelper(source, new Map())
}
