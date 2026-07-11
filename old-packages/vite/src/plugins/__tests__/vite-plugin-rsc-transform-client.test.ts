import path from 'node:path'

import { vol } from 'memfs'
import type { TransformPluginContext } from 'rollup'
import { normalizePath } from 'vite'
import {
  afterAll,
  beforeAll,
  describe,
  it,
  expect,
  vi,
  afterEach,
} from 'vitest'

import { rscTransformUseClientPlugin } from '../vite-plugin-rsc-transform-client.js'

vi.mock('fs', async () => ({ default: (await import('memfs')).fs }))

const RWJS_CWD = process.env.RWJS_CWD
const TEST_RWJS_CWD = '/Users/tobbe/rw-app/'
process.env.RWJS_CWD = TEST_RWJS_CWD

function getPluginTransform(clientEntryFiles: Record<string, string>) {
  const plugin = rscTransformUseClientPlugin(clientEntryFiles)

  if (typeof plugin.transform !== 'function') {
    expect.fail('Expected plugin to have a transform function')
  }

  // Calling `bind` to please TS
  // See https://stackoverflow.com/a/70463512/88106
  // Typecasting because we're only going to call transform, and we don't need
  // anything provided by the context.
  return plugin.transform.bind({} as TransformPluginContext)
}

beforeAll(() => {
  // Add a toml entry for getPaths et al.
  vol.fromJSON({ 'redwood.toml': '' }, TEST_RWJS_CWD)
})

afterAll(() => {
  process.env.RWJS_CWD = RWJS_CWD
})

describe('rscRoutesAutoLoader', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should handle CJS modules with exports.Link = ...', async () => {
    const id = normalizePath(
      path.join(
        TEST_RWJS_CWD,
        'node_modules',
        '@redwoodjs',
        'router',
        'dist',
        'link.js',
      ),
    )

    const output = await getPluginTransform({ 'rsc-link.js-13': id })(
      `"use strict";
      'use client';

      // This needs to be a client component because it uses onClick, and the onClick
      // event handler can't be serialized when passed as an RSC Flight response
      var _Object$defineProperty = require("@babel/runtime-corejs3/core-js/object/define-property");
      var _interopRequireWildcard = require("@babel/runtime-corejs3/helpers/interopRequireWildcard").default;
      _Object$defineProperty(exports, "__esModule", {
        value: true
      });
      exports.Link = void 0;
      var _react = _interopRequireWildcard(require("react"));
      var _history = require("./history");
      var _jsxRuntime = require("react/jsx-runtime");
      const Link = exports.Link = /*#__PURE__*/(0, _react.forwardRef)((_ref, ref) => {
        let {
          to,
          onClick,
          ...rest
        } = _ref;
        return /*#__PURE__*/(0, _jsxRuntime.jsx)("a", {
          href: to,
          ref: ref,
          ...rest,
          onClick: event => {
            if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
              return;
            }
            event.preventDefault();
            if (onClick) {
              const result = onClick(event);
              if (typeof result !== 'boolean' || result) {
                (0, _history.navigate)(to);
              }
            } else {
              (0, _history.navigate)(to);
            }
          }
        });
      });
      `,
      id,
    )

    // What we are interested in seeing here is:
    // - There's a registerClientReference import
    // - There's a Link export
    // - There's a registerClientReference call with the path to the built link
    //   component dist file
    expect(output).toMatchInlineSnapshot(`
        "import {registerClientReference} from "react-server-dom-webpack/server";
        export const Link = registerClientReference(function() {throw new Error("Attempted to call Link() from the server but Link is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");},"/Users/tobbe/rw-app/web/dist/rsc/assets/rsc-link.js-13.mjs","Link")
        ;"
      `)
  })

  it('should handle CJS modules with module.exports = { ErrorIcon, ToastBar, ... }', async () => {
    const id = normalizePath(
      path.join(
        TEST_RWJS_CWD,
        'node_modules',
        'react-hot-toast',
        'dist',
        'index.js',
      ),
    )

    const output = await getPluginTransform({ 'rsc-index.js-15': id })(
      `"use client";
      "use strict";var Y=Object.create;var E=Object.defineProperty;var q=Object.getOwnPropertyDescriptor;var G=Object.getOwnPropertyNames;var K=Object.getPrototypeOf,Z=Object.prototype.hasOwnProperty;
      var ee=(e,t)=>{for(var o in t)E(e,o,{get:t[o],enumerable:!0})},j=(e,t,o,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of G(t))!Z.call(e,r)&&r!==o&&E(e,r,{get:()=>t[r],enumerable:!(s=q(t,r))||s.enumerable});
      return e};var W=(e,t,o)=>(o=e!=null?Y(K(e)):{},j(t||!e||!e.__esModule?E(o,"default",{value:e,enumerable:!0}):o,e)),te=e=>j(E({},"__esModule",{value:!0}),e);var Ve={};ee(Ve,{CheckmarkIcon:()=>F,ErrorIcon:()=>w,LoaderIcon:()=>M,ToastBar:()=>$,ToastIcon:()=>U,Toaster:()=>J,default:()=>_e,resolveValue:()=>u,toast:()=>n,useToaster:()=>V,useToasterStore:()=>_});
      module.exports=te(Ve);var oe=e=>typeof e=="function",u=(e,t)=>oe(e)?e(t):e;var Q=(()=>{let e=0;return()=>(++e).toString()})(),R=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){
        let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches
      }return e}})();var k=require("react"),re=20;var v=new Map,se=1e3,X=e=>{if(v.has(e))return;let t=setTimeout(()=>{v.delete(e),l({type:4,toastId:e})},se);
      v.set(e,t)},ae=e=>{let t=v.get(e);t&&clearTimeout(t)},H=(e,t)=>{switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,re)};case 1:return t.toast.id&&ae(t.toast.id),
      {...e,toasts:e.toasts.map(a=>a.id===t.toast.id?{...a,...t.toast}:a)};case 2:let{toast:o}=t;return e.toasts.find(a=>a.id===o.id)?H(e,{type:1,toast:o}):H(e,{type:0,toast:o});
      case 3:let{toastId:s}=t;return s?X(s):e.toasts.forEach(a=>{X(a.id)}),{...e,toasts:e.toasts.map(a=>a.id===s||s===void 0?{...a,visible:!1}:a)};
      case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(a=>a.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};
      case 6:let r=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(a=>({...a,pauseDuration:a.pauseDuration+r}))}}},I=[],D={toasts:[],pausedAt:void 0},l=e=>{D=H(D,e),I.forEach(t=>{t(D)})},ie={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},_=(e={})=>{let[t,o]=(0,k.useState)(D);(0,k.useEffect)(()=>(I.push(o),()=>{let r=I.indexOf(o);r>-1&&I.splice(r,1)}),[t]);
      let s=t.toasts.map(r=>{var a,c;return{...e,...e[r.type],...r,duration:r.duration||((a=e[r.type])==null?void 0:a.duration)||(e==null?void 0:e.duration)||ie[r.type],style:{...e.style,...(c=e[r.type])==null?void 0:c.style,...r.style}}});return{...t,toasts:s}};var ce=(e,t="blank",o)=>({createdAt:Date.now(),visible:!0,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...o,id:(o==null?void 0:o.id)||Q()}),S=e=>(t,o)=>{let s=ce(t,e,o);return l({type:2,toast:s}),s.id},n=(e,t)=>S("blank")(e,t);n.error=S("error");n.success=S("success");
      n.loading=S("loading");n.custom=S("custom");n.dismiss=e=>{l({type:3,toastId:e})};n.remove=e=>l({type:4,toastId:e});n.promise=(e,t,o)=>{let s=n.loading(t.loading,{...o,...o==null?void 0:o.loading});
      return e.then(r=>(n.success(u(t.success,r),{id:s,...o,...o==null?void 0:o.success}),r)).catch(r=>{n.error(u(t.error,r),{id:s,...o,...o==null?void 0:o.error})}),e};var A=require("react");var pe=(e,t)=>{l({type:1,toast:{id:e,height:t}})},de=()=>{l({type:5,time:Date.now()})},V=e=>{let{toasts:t,pausedAt:o}=_(e);(0,A.useEffect)(()=>{if(o)return;let a=Date.now(),c=t.map(i=>{if(i.duration===1/0)return;let d=(i.duration||0)+i.pauseDuration-(a-i.createdAt);if(d<0){i.visible&&n.dismiss(i.id);return}return setTimeout(()=>n.dismiss(i.id),d)});return()=>{c.forEach(i=>i&&clearTimeout(i))}},[t,o]);
      let s=(0,A.useCallback)(()=>{o&&l({type:6,time:Date.now()})},[o]),r=(0,A.useCallback)((a,c)=>{let{reverseOrder:i=!1,gutter:d=8,defaultPosition:p}=c||{},g=t.filter(m=>(m.position||p)===(a.position||p)&&m.height),z=g.findIndex(m=>m.id===a.id),O=g.filter((m,B)=>B<z&&m.visible).length;return g.filter(m=>m.visible).slice(...i?[O+1]:[0,O]).reduce((m,B)=>m+(B.height||0)+d,0)},[t]);return{toasts:t,handlers:{updateHeight:pe,startPause:de,endPause:s,calculateOffset:r}}};var T=W(require("react")),b=require("goober");var y=W(require("react")),x=require("goober");var h=require("goober"),
      me='',le='',w='';var C=require("goober"),Te='',M='';var P=require("goober"),fe='',ye='',F='';var ge='',he='',xe='',be='',U=({toast:e})=>{let{icon:t,type:o,iconTheme:s}=e;return t!==void 0?typeof t=="string"?y.createElement(be,null,t):t:o==="blank"?null:y.createElement(he,null,y.createElement(M,{...s}),o!=="loading"&&y.createElement(ge,null,o==="error"?y.createElement(w,{...s}):y.createElement(F,{...s})))};
      var Se=e=>'',Ae=e=>'',Pe="0%{opacity:0;} 100%{opacity:1;}",Oe="0%{opacity:1;} 100%{opacity:0;}",Ee='',Re='',ve=(e,t)=>{let s=e.includes("top")?1:-1,[r,a]=R()?[Pe,Oe]:[Se(s),Ae(s)];return{}},$=T.memo(({toast:e,position:t,style:o,children:s})=>{let r=e.height?ve(e.position||t||"top-center",e.visible):{opacity:0},a=T.createElement(U,{toast:e}),c=T.createElement(Re,{...e.ariaProps},u(e.message,e));return T.createElement(Ee,{className:e.className,style:{...r,...o,...e.style}},typeof s=="function"?s({icon:a,message:c}):T.createElement(T.Fragment,null,a,c))});var N=require("goober"),f=W(require("react"));(0,N.setup)(f.createElement);
      var Ie=({id:e,className:t,style:o,onHeightUpdate:s,children:r})=>{let a=f.useCallback(c=>{if(c){let i=()=>{let d=c.getBoundingClientRect().height;s(e,d)};i(),new MutationObserver(i).observe(c,{subtree:!0,childList:!0,characterData:!0})}},[e,s]);return f.createElement("div",{ref:a,className:t,style:o},r)},De=(e,t)=>{let o=e.includes("top"),s=o?{top:0}:{bottom:0},r=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};
      return{left:0,right:0,display:"flex",position:"absolute",transition:R()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:'translateY(5px)',...s,...r}},ke='',L=16,J=({reverseOrder:e,position:t="top-center",toastOptions:o,gutter:s,children:r,containerStyle:a,containerClassName:c})=>{let{toasts:i,handlers:d}=V(o);
      return f.createElement("div",{style:{position:"fixed",zIndex:9999,top:L,left:L,right:L,bottom:L,pointerEvents:"none",...a},className:c,onMouseEnter:d.startPause,onMouseLeave:d.endPause},i.map(p=>{let g=p.position||t,z=d.calculateOffset(p,{reverseOrder:e,gutter:s,defaultPosition:t}),O=De(g,z);return f.createElement(Ie,{id:p.id,key:p.id,onHeightUpdate:d.updateHeight,className:p.visible?ke:"",style:O},p.type==="custom"?u(p.message,p):r?r(p):f.createElement($,{toast:p,position:g}))}))};var _e=n;0&&(module.exports={CheckmarkIcon,ErrorIcon,LoaderIcon,ToastBar,ToastIcon,Toaster,resolveValue,toast,useToaster,useToasterStore});
      //# sourceMappingURL=index.js.map`,
      id,
    )

    // What we are interested in seeing here is:
    // - The import of `registerClientReference` from `react-server-dom-webpack/server`
    // - The export of all of the individual components
    expect(output).toMatchInlineSnapshot(`
        "import {registerClientReference} from "react-server-dom-webpack/server";
        export const CheckmarkIcon = registerClientReference(function() {throw new Error("Attempted to call CheckmarkIcon() from the server but CheckmarkIcon is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");},"/Users/tobbe/rw-app/web/dist/rsc/assets/rsc-index.js-15.mjs","CheckmarkIcon")
        ;export const ErrorIcon = registerClientReference(function() {throw new Error("Attempted to call ErrorIcon() from the server but ErrorIcon is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");},"/Users/tobbe/rw-app/web/dist/rsc/assets/rsc-index.js-15.mjs","ErrorIcon")
        ;export const LoaderIcon = registerClientReference(function() {throw new Error("Attempted to call LoaderIcon() from the server but LoaderIcon is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");},"/Users/tobbe/rw-app/web/dist/rsc/assets/rsc-index.js-15.mjs","LoaderIcon")
        ;export const ToastBar = registerClientReference(function() {throw new Error("Attempted to call ToastBar() from the server but ToastBar is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");},"/Users/tobbe/rw-app/web/dist/rsc/assets/rsc-index.js-15.mjs","ToastBar")
        ;export const ToastIcon = registerClientReference(function() {throw new Error("Attempted to call ToastIcon() from the server but ToastIcon is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");},"/Users/tobbe/rw-app/web/dist/rsc/assets/rsc-index.js-15.mjs","ToastIcon")
        ;export const Toaster = registerClientReference(function() {throw new Error("Attempted to call Toaster() from the server but Toaster is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");},"/Users/tobbe/rw-app/web/dist/rsc/assets/rsc-index.js-15.mjs","Toaster")
        ;export const resolveValue = registerClientReference(function() {throw new Error("Attempted to call resolveValue() from the server but resolveValue is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");},"/Users/tobbe/rw-app/web/dist/rsc/assets/rsc-index.js-15.mjs","resolveValue")
        ;export const toast = registerClientReference(function() {throw new Error("Attempted to call toast() from the server but toast is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");},"/Users/tobbe/rw-app/web/dist/rsc/assets/rsc-index.js-15.mjs","toast")
        ;export const useToaster = registerClientReference(function() {throw new Error("Attempted to call useToaster() from the server but useToaster is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");},"/Users/tobbe/rw-app/web/dist/rsc/assets/rsc-index.js-15.mjs","useToaster")
        ;export const useToasterStore = registerClientReference(function() {throw new Error("Attempted to call useToasterStore() from the server but useToasterStore is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");},"/Users/tobbe/rw-app/web/dist/rsc/assets/rsc-index.js-15.mjs","useToasterStore")
        ;"
      `)
  })
})
