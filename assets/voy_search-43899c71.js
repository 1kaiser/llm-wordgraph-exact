let z, q, N, J, M, R, H, D, B, I, P, G, me, ve, ye, he, pe, xe;
let __tla = (async () => {
  const S = "/llm-wordgraph-exact/assets/voy_search_bg-a73a7fb5.wasm", W = async (e = {}, n) => {
    let _;
    if (n.startsWith("data:")) {
      const r = n.replace(/^data:.*?base64,/, "");
      let o;
      if (typeof Buffer == "function" && typeof Buffer.from == "function")
        o = Buffer.from(r, "base64");
      else if (typeof atob == "function") {
        const c = atob(r);
        o = new Uint8Array(c.length);
        for (let i = 0; i < c.length; i++)
          o[i] = c.charCodeAt(i);
      } else
        throw new Error("Cannot decode base64-encoded data URL");
      _ = await WebAssembly.instantiate(o, e);
    } else {
      const r = await fetch(n), o = r.headers.get("Content-Type") || "";
      if ("instantiateStreaming" in WebAssembly && o.startsWith("application/wasm"))
        _ = await WebAssembly.instantiateStreaming(r, e);
      else {
        const c = await r.arrayBuffer();
        _ = await WebAssembly.instantiate(c, e);
      }
    }
    return _.instance.exports;
  };
  let t;
  M = function(e) {
    t = e;
  };
  const u = new Array(128).fill(void 0);
  u.push(void 0, null, true, false);
  function y(e) {
    return u[e];
  }
  let p = u.length;
  function f(e) {
    p === u.length && u.push(u.length + 1);
    const n = p;
    return p = u[n], u[n] = e, n;
  }
  function L(e) {
    e < 132 || (u[e] = p, p = e);
  }
  function T(e) {
    const n = y(e);
    return L(e), n;
  }
  let l = 0, m = null;
  function x() {
    return (m === null || m.byteLength === 0) && (m = new Uint8Array(t.memory.buffer)), m;
  }
  const U = typeof TextEncoder > "u" ? (0, module.require)("util").TextEncoder : TextEncoder;
  let k = new U("utf-8");
  const $ = typeof k.encodeInto == "function" ? function(e, n) {
    return k.encodeInto(e, n);
  } : function(e, n) {
    const _ = k.encode(e);
    return n.set(_), {
      read: e.length,
      written: _.length
    };
  };
  function w(e, n, _) {
    if (_ === void 0) {
      const s = k.encode(e), b = n(s.length) >>> 0;
      return x().subarray(b, b + s.length).set(s), l = s.length, b;
    }
    let r = e.length, o = n(r) >>> 0;
    const c = x();
    let i = 0;
    for (; i < r; i++) {
      const s = e.charCodeAt(i);
      if (s > 127)
        break;
      c[o + i] = s;
    }
    if (i !== r) {
      i !== 0 && (e = e.slice(i)), o = _(o, r, r = i + e.length * 3) >>> 0;
      const s = x().subarray(o + i, o + r), b = $(e, s);
      i += b.written;
    }
    return l = i, o;
  }
  function j(e) {
    return e == null;
  }
  let h = null;
  function d() {
    return (h === null || h.byteLength === 0) && (h = new Int32Array(t.memory.buffer)), h;
  }
  const C = typeof TextDecoder > "u" ? (0, module.require)("util").TextDecoder : TextDecoder;
  let A = new C("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  A.decode();
  function g(e, n) {
    return e = e >>> 0, A.decode(x().subarray(e, e + n));
  }
  let v = null;
  function F() {
    return (v === null || v.byteLength === 0) && (v = new Float32Array(t.memory.buffer)), v;
  }
  function E(e, n) {
    const _ = n(e.length * 4) >>> 0;
    return F().set(e, _ / 4), l = e.length, _;
  }
  ye = function(e) {
    let n, _;
    try {
      const c = t.__wbindgen_add_to_stack_pointer(-16);
      t.index(c, f(e));
      var r = d()[c / 4 + 0], o = d()[c / 4 + 1];
      return n = r, _ = o, g(r, o);
    } finally {
      t.__wbindgen_add_to_stack_pointer(16), t.__wbindgen_free(n, _);
    }
  };
  pe = function(e, n, _) {
    const r = w(e, t.__wbindgen_malloc, t.__wbindgen_realloc), o = l, c = E(n, t.__wbindgen_malloc), i = l, s = t.search(r, o, c, i, _);
    return T(s);
  };
  me = function(e, n) {
    let _, r;
    try {
      const i = t.__wbindgen_add_to_stack_pointer(-16), s = w(e, t.__wbindgen_malloc, t.__wbindgen_realloc), b = l;
      t.add(i, s, b, f(n));
      var o = d()[i / 4 + 0], c = d()[i / 4 + 1];
      return _ = o, r = c, g(o, c);
    } finally {
      t.__wbindgen_add_to_stack_pointer(16), t.__wbindgen_free(_, r);
    }
  };
  he = function(e, n) {
    let _, r;
    try {
      const i = t.__wbindgen_add_to_stack_pointer(-16), s = w(e, t.__wbindgen_malloc, t.__wbindgen_realloc), b = l;
      t.remove(i, s, b, f(n));
      var o = d()[i / 4 + 0], c = d()[i / 4 + 1];
      return _ = o, r = c, g(o, c);
    } finally {
      t.__wbindgen_add_to_stack_pointer(16), t.__wbindgen_free(_, r);
    }
  };
  ve = function(e) {
    let n, _;
    try {
      const c = t.__wbindgen_add_to_stack_pointer(-16), i = w(e, t.__wbindgen_malloc, t.__wbindgen_realloc), s = l;
      t.clear(c, i, s);
      var r = d()[c / 4 + 0], o = d()[c / 4 + 1];
      return n = r, _ = o, g(r, o);
    } finally {
      t.__wbindgen_add_to_stack_pointer(16), t.__wbindgen_free(n, _);
    }
  };
  xe = function(e) {
    const n = w(e, t.__wbindgen_malloc, t.__wbindgen_realloc), _ = l;
    return t.size(n, _) >>> 0;
  };
  function O(e, n) {
    try {
      return e.apply(this, n);
    } catch (_) {
      t.__wbindgen_exn_store(f(_));
    }
  }
  z = class {
    static __wrap(n) {
      n = n >>> 0;
      const _ = Object.create(z.prototype);
      return _.__wbg_ptr = n, _;
    }
    __destroy_into_raw() {
      const n = this.__wbg_ptr;
      return this.__wbg_ptr = 0, n;
    }
    free() {
      const n = this.__destroy_into_raw();
      t.__wbg_voy_free(n);
    }
    constructor(n) {
      const _ = t.voy_new(j(n) ? 0 : f(n));
      return z.__wrap(_);
    }
    serialize() {
      let n, _;
      try {
        const c = t.__wbindgen_add_to_stack_pointer(-16);
        t.voy_serialize(c, this.__wbg_ptr);
        var r = d()[c / 4 + 0], o = d()[c / 4 + 1];
        return n = r, _ = o, g(r, o);
      } finally {
        t.__wbindgen_add_to_stack_pointer(16), t.__wbindgen_free(n, _);
      }
    }
    static deserialize(n) {
      const _ = w(n, t.__wbindgen_malloc, t.__wbindgen_realloc), r = l, o = t.voy_deserialize(_, r);
      return z.__wrap(o);
    }
    index(n) {
      t.voy_index(this.__wbg_ptr, f(n));
    }
    search(n, _) {
      const r = E(n, t.__wbindgen_malloc), o = l, c = t.voy_search(this.__wbg_ptr, r, o, _);
      return T(c);
    }
    add(n) {
      t.voy_add(this.__wbg_ptr, f(n));
    }
    remove(n) {
      t.voy_remove(this.__wbg_ptr, f(n));
    }
    clear() {
      t.voy_clear(this.__wbg_ptr);
    }
    size() {
      return t.voy_size(this.__wbg_ptr) >>> 0;
    }
  };
  B = function(e) {
    const n = y(e);
    return f(n);
  };
  D = function(e) {
    return y(e) === void 0;
  };
  I = function(e) {
    T(e);
  };
  N = function() {
    const e = new Error();
    return f(e);
  };
  R = function(e, n) {
    const _ = y(n).stack, r = w(_, t.__wbindgen_malloc, t.__wbindgen_realloc), o = l;
    d()[e / 4 + 1] = o, d()[e / 4 + 0] = r;
  };
  q = function(e, n) {
    let _, r;
    try {
      _ = e, r = n, console.error(g(e, n));
    } finally {
      t.__wbindgen_free(_, r);
    }
  };
  J = function() {
    return O(function(e, n) {
      const _ = JSON.parse(g(e, n));
      return f(_);
    }, arguments);
  };
  H = function() {
    return O(function(e) {
      const n = JSON.stringify(y(e));
      return f(n);
    }, arguments);
  };
  P = function(e, n) {
    const _ = y(n), r = typeof _ == "string" ? _ : void 0;
    var o = j(r) ? 0 : w(r, t.__wbindgen_malloc, t.__wbindgen_realloc), c = l;
    d()[e / 4 + 1] = c, d()[e / 4 + 0] = o;
  };
  G = function(e, n) {
    throw new Error(g(e, n));
  };
  URL = globalThis.URL;
  const a = await W({
    "./voy_search_bg.js": {
      __wbindgen_object_clone_ref: B,
      __wbindgen_is_undefined: D,
      __wbindgen_object_drop_ref: I,
      __wbg_new_abda76e883ba8a5f: N,
      __wbg_stack_658279fe44541cf6: R,
      __wbg_error_f851667af71bcfc6: q,
      __wbg_parse_76a8a18ca3f8730b: J,
      __wbg_stringify_d06ad2addc54d51e: H,
      __wbindgen_string_get: P,
      __wbindgen_throw: G
    }
  }, S), K = a.memory, Q = a.__wbg_voy_free, X = a.voy_new, Y = a.voy_serialize, Z = a.voy_deserialize, V = a.voy_index, ee = a.voy_search, ne = a.voy_add, te = a.voy_remove, _e = a.voy_clear, re = a.voy_size, oe = a.index, ce = a.search, ie = a.add, ae = a.remove, se = a.clear, de = a.size, le = a.__wbindgen_malloc, fe = a.__wbindgen_realloc, be = a.__wbindgen_add_to_stack_pointer, ue = a.__wbindgen_free, we = a.__wbindgen_exn_store, ge = Object.freeze(Object.defineProperty({
    __proto__: null,
    __wbg_voy_free: Q,
    __wbindgen_add_to_stack_pointer: be,
    __wbindgen_exn_store: we,
    __wbindgen_free: ue,
    __wbindgen_malloc: le,
    __wbindgen_realloc: fe,
    add: ie,
    clear: se,
    index: oe,
    memory: K,
    remove: ae,
    search: ce,
    size: de,
    voy_add: ne,
    voy_clear: _e,
    voy_deserialize: Z,
    voy_index: V,
    voy_new: X,
    voy_remove: te,
    voy_search: ee,
    voy_serialize: Y,
    voy_size: re
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  M(ge);
})();
export {
  z as Voy,
  __tla,
  q as __wbg_error_f851667af71bcfc6,
  N as __wbg_new_abda76e883ba8a5f,
  J as __wbg_parse_76a8a18ca3f8730b,
  M as __wbg_set_wasm,
  R as __wbg_stack_658279fe44541cf6,
  H as __wbg_stringify_d06ad2addc54d51e,
  D as __wbindgen_is_undefined,
  B as __wbindgen_object_clone_ref,
  I as __wbindgen_object_drop_ref,
  P as __wbindgen_string_get,
  G as __wbindgen_throw,
  me as add,
  ve as clear,
  ye as index,
  he as remove,
  pe as search,
  xe as size
};
