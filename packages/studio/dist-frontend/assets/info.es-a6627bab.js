import{C as y}from"./codemirror.es-9ef43c07.js";import{g as C,a as M,b as V,c as _,d as x,e as u}from"./SchemaReference.es-0a06119c.js";import"./info-addon.es-2fbb01bd.js";import{n as f,q as p}from"./index-35a59182.js";import"./forEachState.es-1e367fb2.js";var A=Object.defineProperty,l=(a,e)=>A(a,"name",{value:e,configurable:!0});y.registerHelper("info","graphql",(a,e)=>{if(!e.schema||!a.state)return;const{kind:d,step:n}=a.state,r=C(e.schema,a.state);if(d==="Field"&&n===0&&r.fieldDef||d==="AliasedField"&&n===2&&r.fieldDef){const i=document.createElement("div");i.className="CodeMirror-info-header",v(i,r,e);const c=document.createElement("div");return c.append(i),o(c,e,r.fieldDef),c}if(d==="Directive"&&n===1&&r.directiveDef){const i=document.createElement("div");i.className="CodeMirror-info-header",E(i,r,e);const c=document.createElement("div");return c.append(i),o(c,e,r.directiveDef),c}if(d==="Argument"&&n===0&&r.argDef){const i=document.createElement("div");i.className="CodeMirror-info-header",T(i,r,e);const c=document.createElement("div");return c.append(i),o(c,e,r.argDef),c}if(d==="EnumValue"&&r.enumValue&&r.enumValue.description){const i=document.createElement("div");i.className="CodeMirror-info-header",N(i,r,e);const c=document.createElement("div");return c.append(i),o(c,e,r.enumValue),c}if(d==="NamedType"&&r.type&&r.type.description){const i=document.createElement("div");i.className="CodeMirror-info-header",m(i,r,e,r.type);const c=document.createElement("div");return c.append(i),o(c,e,r.type),c}});function v(a,e,d){D(a,e,d),s(a,e,d,e.type)}l(v,"renderField");function D(a,e,d){var n;const r=((n=e.fieldDef)===null||n===void 0?void 0:n.name)||"";t(a,r,"field-name",d,M(e))}l(D,"renderQualifiedField");function E(a,e,d){var n;const r="@"+(((n=e.directiveDef)===null||n===void 0?void 0:n.name)||"");t(a,r,"directive-name",d,V(e))}l(E,"renderDirective");function T(a,e,d){var n;const r=((n=e.argDef)===null||n===void 0?void 0:n.name)||"";t(a,r,"arg-name",d,_(e)),s(a,e,d,e.inputType)}l(T,"renderArg");function N(a,e,d){var n;const r=((n=e.enumValue)===null||n===void 0?void 0:n.name)||"";m(a,e,d,e.inputType),t(a,"."),t(a,r,"enum-value",d,x(e))}l(N,"renderEnumValue");function s(a,e,d,n){const r=document.createElement("span");r.className="type-name-pill",n instanceof f?(m(r,e,d,n.ofType),t(r,"!")):n instanceof p?(t(r,"["),m(r,e,d,n.ofType),t(r,"]")):t(r,(n==null?void 0:n.name)||"","type-name",d,u(e,n)),a.append(r)}l(s,"renderTypeAnnotation");function m(a,e,d,n){n instanceof f?(m(a,e,d,n.ofType),t(a,"!")):n instanceof p?(t(a,"["),m(a,e,d,n.ofType),t(a,"]")):t(a,(n==null?void 0:n.name)||"","type-name",d,u(e,n))}l(m,"renderType");function o(a,e,d){const{description:n}=d;if(n){const r=document.createElement("div");r.className="info-description",e.renderDescription?r.innerHTML=e.renderDescription(n):r.append(document.createTextNode(n)),a.append(r)}g(a,e,d)}l(o,"renderDescription");function g(a,e,d){const n=d.deprecationReason;if(n){const r=document.createElement("div");r.className="info-deprecation",a.append(r);const i=document.createElement("span");i.className="info-deprecation-label",i.append(document.createTextNode("Deprecated")),r.append(i);const c=document.createElement("div");c.className="info-deprecation-reason",e.renderDescription?c.innerHTML=e.renderDescription(n):c.append(document.createTextNode(n)),r.append(c)}}l(g,"renderDeprecation");function t(a,e,d="",n={onClick:null},r=null){if(d){const{onClick:i}=n;let c;i?(c=document.createElement("a"),c.href="javascript:void 0",c.addEventListener("click",h=>{i(r,h)})):c=document.createElement("span"),c.className=d,c.append(document.createTextNode(e)),a.append(c)}else a.append(document.createTextNode(e))}l(t,"text");
