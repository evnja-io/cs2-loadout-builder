import { g as get, w as writable, d as derived, r as readable } from "./index2.js";
import * as THREE from "three";
import { REVISION } from "three";
import { v as ssr_context, g as getContext, p as setContext, d as derived$1, w as bind_props } from "./index.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
function toStore(get2, set) {
  const store = writable(get2());
  return {
    subscribe: store.subscribe
  };
}
function fromStore(store) {
  if ("set" in store) {
    return {
      get current() {
        return get(store);
      },
      set current(v) {
        store.set(v);
      }
    };
  }
  return {
    get current() {
      return get(store);
    }
  };
}
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
const useCache = () => {
  const cache = getContext("threlte-cache");
  if (!cache) {
    throw new Error("No cache found. The cache can only be used in a child component to <Canvas>.");
  }
  return cache;
};
const signal = Symbol();
const isStore = (dep) => {
  return typeof dep?.subscribe === "function";
};
const runObserve = (dependencies, callback, pre) => {
  dependencies().map((d) => {
    if (isStore(d)) {
      return fromStore(d);
    }
    return signal;
  });
};
const observePost = (dependencies, callback) => {
  return runObserve(dependencies);
};
const observePre = (dependencies, callback) => {
  return runObserve(dependencies);
};
Object.assign(observePost, { pre: observePre });
const asyncWritable = (promise) => {
  const store = writable(void 0);
  const error = writable(void 0);
  promise.then((result) => {
    store.set(result);
  }).catch((e) => {
    console.error("Error in asyncWritable:", e.message);
    error.set(e);
  });
  return Object.assign(Object.assign(promise, store), { error, promise });
};
const browser = typeof window !== "undefined";
REVISION.replace("dev", "");
const currentWritable = (value) => {
  const store = writable(value);
  const extendedWritable = {
    set: (value2) => {
      extendedWritable.current = value2;
      store.set(value2);
    },
    subscribe: store.subscribe,
    update: (fn) => {
      const newValue = fn(extendedWritable.current);
      extendedWritable.current = newValue;
      store.set(newValue);
    },
    current: value
  };
  return extendedWritable;
};
const useDOM = () => {
  const context = getContext("threlte-dom-context");
  if (!context) {
    throw new Error("useDOM can only be used in a child component to <Canvas>.");
  }
  return context;
};
function mitt(n) {
  return { all: n = n || /* @__PURE__ */ new Map(), on: function(t, e) {
    var i = n.get(t);
    i ? i.push(e) : n.set(t, [e]);
  }, off: function(t, e) {
    var i = n.get(t);
    i && (e ? i.splice(i.indexOf(e) >>> 0, 1) : n.set(t, []));
  }, emit: function(t, e) {
    var i = n.get(t);
    i && i.slice().map(function(n2) {
      n2(e);
    }), (i = n.get("*")) && i.slice().map(function(n2) {
      n2(t, e);
    });
  } };
}
class DAG {
  allVertices = {};
  /** Nodes that are fully unlinked */
  isolatedVertices = {};
  connectedVertices = {};
  sortedConnectedValues = [];
  needsSort = false;
  emitter = mitt();
  emit = this.emitter.emit.bind(this.emitter);
  on = this.emitter.on.bind(this.emitter);
  off = this.emitter.off.bind(this.emitter);
  get sortedVertices() {
    return this.mapNodes((value) => value);
  }
  moveToIsolated(key) {
    const vertex = this.connectedVertices[key];
    if (!vertex)
      return;
    this.isolatedVertices[key] = vertex;
    delete this.connectedVertices[key];
  }
  moveToConnected(key) {
    const vertex = this.isolatedVertices[key];
    if (!vertex)
      return;
    this.connectedVertices[key] = vertex;
    delete this.isolatedVertices[key];
  }
  getKey = (v) => {
    if (typeof v === "object") {
      return v.key;
    }
    return v;
  };
  add(key, value, options) {
    if (this.allVertices[key] && this.allVertices[key].value !== void 0) {
      throw new Error(`A node with the key ${key.toString()} already exists`);
    }
    let vertex = this.allVertices[key];
    if (!vertex) {
      vertex = {
        value,
        previous: /* @__PURE__ */ new Set(),
        next: /* @__PURE__ */ new Set()
      };
      this.allVertices[key] = vertex;
    } else if (vertex.value === void 0) {
      vertex.value = value;
    }
    const hasEdges = vertex.next.size > 0 || vertex.previous.size > 0;
    if (!options?.after && !options?.before && !hasEdges) {
      this.isolatedVertices[key] = vertex;
      this.emit("node:added", {
        key,
        type: "isolated",
        value
      });
      return;
    } else {
      this.connectedVertices[key] = vertex;
    }
    if (options?.after) {
      const afterArr = Array.isArray(options.after) ? options.after : [options.after];
      afterArr.forEach((after) => {
        vertex.previous.add(this.getKey(after));
      });
      afterArr.forEach((after) => {
        const afterKey = this.getKey(after);
        const linkedAfter = this.allVertices[afterKey];
        if (!linkedAfter) {
          this.allVertices[afterKey] = {
            value: void 0,
            // uninitialized
            previous: /* @__PURE__ */ new Set(),
            next: /* @__PURE__ */ new Set([key])
          };
          this.connectedVertices[afterKey] = this.allVertices[afterKey];
        } else {
          linkedAfter.next.add(key);
          this.moveToConnected(afterKey);
        }
      });
    }
    if (options?.before) {
      const beforeArr = Array.isArray(options.before) ? options.before : [options.before];
      beforeArr.forEach((before) => {
        vertex.next.add(this.getKey(before));
      });
      beforeArr.forEach((before) => {
        const beforeKey = this.getKey(before);
        const linkedBefore = this.allVertices[beforeKey];
        if (!linkedBefore) {
          this.allVertices[beforeKey] = {
            value: void 0,
            // uninitialized
            previous: /* @__PURE__ */ new Set([key]),
            next: /* @__PURE__ */ new Set()
          };
          this.connectedVertices[beforeKey] = this.allVertices[beforeKey];
        } else {
          linkedBefore.previous.add(key);
          this.moveToConnected(beforeKey);
        }
      });
    }
    this.emit("node:added", {
      key,
      type: "connected",
      value
    });
    this.needsSort = true;
  }
  remove(key) {
    const removeKey = this.getKey(key);
    const unlinkedVertex = this.isolatedVertices[removeKey];
    if (unlinkedVertex) {
      delete this.isolatedVertices[removeKey];
      delete this.allVertices[removeKey];
      this.emit("node:removed", {
        key: removeKey,
        type: "isolated"
      });
      return;
    }
    const linkedVertex = this.connectedVertices[removeKey];
    if (!linkedVertex) {
      return;
    }
    linkedVertex.next.forEach((nextKey) => {
      const nextVertex = this.connectedVertices[nextKey];
      if (nextVertex) {
        nextVertex.previous.delete(removeKey);
        if (nextVertex.previous.size === 0 && nextVertex.next.size === 0) {
          this.moveToIsolated(nextKey);
        }
      }
    });
    linkedVertex.previous.forEach((prevKey) => {
      const prevVertex = this.connectedVertices[prevKey];
      if (prevVertex) {
        prevVertex.next.delete(removeKey);
        if (prevVertex.previous.size === 0 && prevVertex.next.size === 0) {
          this.moveToIsolated(prevKey);
        }
      }
    });
    delete this.connectedVertices[removeKey];
    delete this.allVertices[removeKey];
    this.emit("node:removed", {
      key: removeKey,
      type: "connected"
    });
    this.needsSort = true;
  }
  mapNodes(callback) {
    if (this.needsSort) {
      this.sort();
    }
    const result = [];
    this.forEachNode((value, index) => {
      result.push(callback(value, index));
    });
    return result;
  }
  forEachNode(callback) {
    if (this.needsSort) {
      this.sort();
    }
    let index = 0;
    for (; index < this.sortedConnectedValues.length; index++) {
      callback(this.sortedConnectedValues[index], index);
    }
    Reflect.ownKeys(this.isolatedVertices).forEach((key) => {
      const vertex = this.isolatedVertices[key];
      if (vertex.value !== void 0)
        callback(vertex.value, index++);
    });
  }
  getValueByKey(key) {
    return this.allVertices[key]?.value;
  }
  getKeyByValue(value) {
    return Reflect.ownKeys(this.connectedVertices).find((key) => this.connectedVertices[key].value === value) ?? Reflect.ownKeys(this.isolatedVertices).find((key) => this.isolatedVertices[key].value === value);
  }
  sort() {
    const inDegree = /* @__PURE__ */ new Map();
    const zeroInDegreeQueue = [];
    const result = [];
    const connectedVertexKeysWithValues = Reflect.ownKeys(this.connectedVertices).filter((key) => {
      const vertex = this.connectedVertices[key];
      return vertex.value !== void 0;
    });
    connectedVertexKeysWithValues.forEach((vertex) => {
      inDegree.set(vertex, 0);
    });
    connectedVertexKeysWithValues.forEach((vertexKey) => {
      const vertex = this.connectedVertices[vertexKey];
      vertex.next.forEach((next) => {
        const nextVertex = this.connectedVertices[next];
        if (!nextVertex)
          return;
        inDegree.set(next, (inDegree.get(next) || 0) + 1);
      });
    });
    inDegree.forEach((degree, value) => {
      if (degree === 0) {
        zeroInDegreeQueue.push(value);
      }
    });
    while (zeroInDegreeQueue.length > 0) {
      const vertexKey = zeroInDegreeQueue.shift();
      result.push(vertexKey);
      const v = connectedVertexKeysWithValues.find((key) => key === vertexKey);
      if (v) {
        this.connectedVertices[v]?.next.forEach((adjVertex) => {
          const adjVertexInDegree = (inDegree.get(adjVertex) || 0) - 1;
          inDegree.set(adjVertex, adjVertexInDegree);
          if (adjVertexInDegree === 0) {
            zeroInDegreeQueue.push(adjVertex);
          }
        });
      }
    }
    if (result.length !== connectedVertexKeysWithValues.length) {
      throw new Error("The graph contains a cycle, and thus can not be sorted topologically.");
    }
    const filterUndefined = (value) => value !== void 0;
    this.sortedConnectedValues = result.map((key) => this.connectedVertices[key].value).filter(filterUndefined);
    this.needsSort = false;
  }
  clear() {
    this.allVertices = {};
    this.isolatedVertices = {};
    this.connectedVertices = {};
    this.sortedConnectedValues = [];
    this.needsSort = false;
  }
  static isKey(value) {
    return typeof value === "string" || typeof value === "symbol";
  }
  static isValue(value) {
    return typeof value === "object" && "key" in value;
  }
}
const useScheduler = () => {
  const context = getContext("threlte-scheduler-context");
  if (!context) {
    throw new Error("useScheduler can only be used in a child component to <Canvas>.");
  }
  return context;
};
const useCamera = () => {
  const context = getContext("threlte-camera-context");
  if (!context) {
    throw new Error("useCamera can only be used in a child component to <Canvas>.");
  }
  return context;
};
const parentContextKey = Symbol("threlte-parent-context");
const createParentContext = (parent) => {
  const ctx = currentWritable(parent);
  setContext(parentContextKey, ctx);
  return ctx;
};
const useParent = () => {
  const parent = getContext(parentContextKey);
  return parent;
};
const parentObject3DContextKey = Symbol("threlte-parent-object3d-context");
const createParentObject3DContext = (object) => {
  const parentObject3D = getContext(parentObject3DContextKey);
  const object3D = writable(object);
  const ctx = derived([object3D, parentObject3D], ([object3D2, parentObject3D2]) => {
    return object3D2 ?? parentObject3D2;
  });
  setContext(parentObject3DContextKey, ctx);
  return object3D;
};
const useParentObject3D = () => {
  return getContext(parentObject3DContextKey);
};
function useTask(keyOrFn, fnOrOptions, options) {
  if (!browser) {
    return {
      task: void 0,
      start: () => void 0,
      stop: () => void 0,
      started: readable(false)
    };
  }
  let key;
  let fn;
  let opts;
  if (DAG.isKey(keyOrFn)) {
    key = keyOrFn;
    fn = fnOrOptions;
    opts = options;
  } else {
    key = Symbol("useTask");
    fn = keyOrFn;
    opts = fnOrOptions;
  }
  const schedulerCtx = useScheduler();
  opts?.autoInvalidate ?? true;
  let stage = schedulerCtx.mainStage;
  let running = derived$1(() => opts?.running?.() ?? opts?.autoStart ?? true);
  if (opts) {
    if (opts.stage) {
      if (DAG.isValue(opts.stage)) {
        stage = opts.stage;
      } else {
        const maybeStage = schedulerCtx.scheduler.getStage(opts.stage);
        if (!maybeStage) {
          throw new Error(`No stage found with key ${opts.stage.toString()}`);
        }
        stage = maybeStage;
      }
    } else if (opts.after) {
      if (Array.isArray(opts.after)) {
        for (let index = 0; index < opts.after.length; index++) {
          const element = opts.after[index];
          if (DAG.isValue(element)) {
            stage = element.stage;
            break;
          }
        }
      } else if (DAG.isValue(opts.after)) {
        stage = opts.after.stage;
      }
    } else if (opts.before) {
      if (Array.isArray(opts.before)) {
        for (let index = 0; index < opts.before.length; index++) {
          const element = opts.before[index];
          if (DAG.isValue(element)) {
            stage = element.stage;
            break;
          }
        }
      } else if (DAG.isValue(opts.before)) {
        stage = opts.before.stage;
      }
    }
  }
  const task = stage.createTask(key, fn, opts);
  return {
    task,
    start: () => {
      running(true);
    },
    stop: () => {
      running(false);
    },
    started: toStore(() => running())
  };
}
const useScene = () => {
  const context = getContext("threlte-scene-context");
  if (!context) {
    throw new Error("useScene can only be used in a child component to <Canvas>.");
  }
  return context;
};
const useRenderer = () => {
  const context = getContext("threlte-renderer-context");
  if (!context) {
    throw new Error("useRenderer can only be used in a child component to <Canvas>.");
  }
  return context;
};
function Canvas($$renderer, $$props) {
  let { children, $$slots, $$events, ...rest } = $$props;
  $$renderer.push(`<div class="svelte-1h6rq69"><canvas class="svelte-1h6rq69">`);
  {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--></canvas></div>`);
}
const useThrelte = () => {
  const schedulerCtx = useScheduler();
  const rendererCtx = useRenderer();
  const cameraCtx = useCamera();
  const sceneCtx = useScene();
  const domCtx = useDOM();
  const context = {
    advance: schedulerCtx.advance,
    autoRender: schedulerCtx.autoRender,
    autoRenderTask: rendererCtx.autoRenderTask,
    camera: cameraCtx.camera,
    colorManagementEnabled: rendererCtx.colorManagementEnabled,
    colorSpace: rendererCtx.colorSpace,
    dpr: rendererCtx.dpr,
    invalidate: schedulerCtx.invalidate,
    mainStage: schedulerCtx.mainStage,
    renderer: rendererCtx.renderer,
    renderMode: schedulerCtx.renderMode,
    renderStage: schedulerCtx.renderStage,
    scheduler: schedulerCtx.scheduler,
    shadows: rendererCtx.shadows,
    shouldRender: schedulerCtx.shouldRender,
    dom: domCtx.dom,
    canvas: domCtx.canvas,
    size: domCtx.size,
    toneMapping: rendererCtx.toneMapping,
    get scene() {
      return sceneCtx.scene;
    },
    set scene(scene) {
      sceneCtx.scene = scene;
    }
  };
  return context;
};
const useAttach = (getRef, getAttach) => {
  const { invalidate } = useThrelte();
  fromStore(useParent());
  fromStore(useParentObject3D());
  createParentContext();
  createParentObject3DContext();
};
const contextName = Symbol("threlte-disposable-object-context");
const useSetDispose = (getDispose) => {
  const parentDispose = getContext(contextName);
  const mergedDispose = derived$1(() => getDispose() ?? parentDispose?.() ?? true);
  setContext(contextName, () => mergedDispose());
};
let currentIs;
const setIs = (is) => {
  currentIs = is;
};
const useIs = () => {
  const is = currentIs;
  currentIs = void 0;
  return is;
};
const pluginContextKey = "threlte-plugin-context";
const usePlugins = (args) => {
  const plugins = getContext(pluginContextKey);
  if (!plugins)
    return;
  const pluginsProps = [];
  const pluginsArray = Object.values(plugins);
  if (pluginsArray.length > 0) {
    const pluginArgs = args();
    for (let i = 0; i < pluginsArray.length; i++) {
      const plugin = pluginsArray[i];
      const p = plugin(pluginArgs);
      if (p && p.pluginProps) {
        pluginsProps.push(...p.pluginProps);
      }
    }
  }
  return {
    pluginsProps
  };
};
const useProps = (object, props, pluginProps) => {
  const { invalidate } = useThrelte();
};
const isClass = (input) => {
  return typeof input === "function" && Function.prototype.toString.call(input).startsWith("class ");
};
const determineRef = (is, args) => {
  if (isClass(is)) {
    if (Array.isArray(args)) {
      return new is(...args);
    } else {
      return new is();
    }
  }
  return is;
};
function T$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      is = useIs(),
      args,
      attach,
      manual = false,
      makeDefault = false,
      dispose,
      ref = void 0,
      oncreate,
      children,
      $$slots,
      $$events,
      ...props
    } = $$props;
    const internalRef = derived$1(() => determineRef(is, args));
    usePlugins(() => ({
      get ref() {
        return internalRef();
      },
      get args() {
        return args;
      },
      get attach() {
        return attach;
      },
      get manual() {
        return manual;
      },
      get makeDefault() {
        return makeDefault;
      },
      get dispose() {
        return dispose;
      },
      get props() {
        return props;
      }
    }));
    useProps();
    useAttach();
    useSetDispose(() => dispose);
    children?.($$renderer2, { ref: internalRef() });
    $$renderer2.push(`<!---->`);
    bind_props($$props, { ref });
  });
}
const catalogue = {};
const T = new Proxy(T$1, {
  get(_target, is) {
    if (typeof is !== "string") {
      return Reflect.get(_target, is);
    }
    const module = catalogue[is] || THREE[is];
    if (module === void 0) {
      throw new Error(`No Three.js module found for ${is}. Did you forget to extend the catalogue?`);
    }
    setIs(module);
    return T$1;
  }
});
function useLoader(Proto, options) {
  const { remember, clear: clearCacheItem } = useCache();
  let loader;
  const initializeLoader = () => {
    const lazyLoader = new Proto(...[]);
    return lazyLoader;
  };
  const load = (input, options2) => {
    const loadResource = async (url) => {
      if (!loader) {
        loader = initializeLoader();
      }
      if ("loadAsync" in loader) {
        const result = await loader.loadAsync(url, options2?.onProgress);
        return options2?.transform?.(result) ?? result;
      } else {
        return new Promise((resolve, reject) => {
          loader.load(url, (data) => resolve(options2?.transform?.(data) ?? data), (event) => options2?.onProgress?.(event), reject);
        });
      }
    };
    if (Array.isArray(input)) {
      const promises = input.map((url) => {
        return remember(() => loadResource(url), [Proto, url]);
      });
      const store = asyncWritable(Promise.all(promises));
      return store;
    } else if (typeof input === "string") {
      const promise = remember(() => loadResource(input), [Proto, input]);
      const store = asyncWritable(promise);
      return store;
    } else {
      const promises = Object.values(input).map((url) => {
        return remember(() => loadResource(url), [Proto, url]);
      });
      const store = asyncWritable(Promise.all(promises).then((results) => {
        return Object.fromEntries(Object.entries(input).map(([key], i) => [key, results[i]]));
      }));
      return store;
    }
  };
  const clear = (input) => {
    if (Array.isArray(input)) {
      input.forEach((url) => {
        clearCacheItem([Proto, url]);
      });
    } else if (typeof input === "string") {
      clearCacheItem([Proto, input]);
    } else {
      Object.entries(input).forEach(([key, url]) => {
        clearCacheItem([Proto, key, url]);
      });
    }
  };
  return {
    load,
    clear,
    loader
  };
}
function OrbitControlsSetup($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { camera, renderer, invalidate } = useThrelte();
    useTask(() => {
    });
    onDestroy(() => {
    });
  });
}
new THREE.TextureLoader();
function WeaponMesh($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    useLoader(GLTFLoader);
    onDestroy(() => {
    });
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function WeaponScene($$renderer, $$props) {
  let { skin, wear, seed } = $$props;
  $$renderer.push(`<div class="w-full h-full min-h-96 rounded-lg overflow-hidden bg-gray-900">`);
  if (skin) {
    $$renderer.push("<!--[0-->");
    Canvas($$renderer, {
      children: ($$renderer2) => {
        if (T.PerspectiveCamera) {
          $$renderer2.push("<!--[-->");
          T.PerspectiveCamera($$renderer2, { makeDefault: true, position: [0, 0, 2.5], fov: 45 });
          $$renderer2.push("<!--]-->");
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push("<!--]-->");
        }
        $$renderer2.push(` `);
        OrbitControlsSetup($$renderer2);
        $$renderer2.push(`<!----> `);
        if (T.AmbientLight) {
          $$renderer2.push("<!--[-->");
          T.AmbientLight($$renderer2, { intensity: 0.4 });
          $$renderer2.push("<!--]-->");
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push("<!--]-->");
        }
        $$renderer2.push(` `);
        if (T.DirectionalLight) {
          $$renderer2.push("<!--[-->");
          T.DirectionalLight($$renderer2, { position: [2, 4, 3], intensity: 1.2, castShadow: true });
          $$renderer2.push("<!--]-->");
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push("<!--]-->");
        }
        $$renderer2.push(` `);
        if (T.HemisphereLight) {
          $$renderer2.push("<!--[-->");
          T.HemisphereLight($$renderer2, { skyColor: 16777215, groundColor: 4473924, intensity: 0.6 });
          $$renderer2.push("<!--]-->");
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push("<!--]-->");
        }
        $$renderer2.push(` `);
        WeaponMesh($$renderer2);
        $$renderer2.push(`<!---->`);
      },
      $$slots: { default: true }
    });
  } else {
    $$renderer.push("<!--[-1-->");
    $$renderer.push(`<div class="flex items-center justify-center h-full text-gray-500"><p>Select a weapon to preview</p></div>`);
  }
  $$renderer.push(`<!--]--></div>`);
}
export {
  WeaponScene as W
};
