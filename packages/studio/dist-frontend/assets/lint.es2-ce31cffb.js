import{C as D}from"./codemirror.es-9ef43c07.js";import{n as B,q as H,t as J,w as U,F as z}from"./index-35a59182.js";var K=Object.defineProperty,t=(e,r)=>K(e,"name",{value:r,configurable:!0});function G(e){d=e,y=e.length,s=l=x=-1,i(),E();const r=$();return p("EOF"),r}t(G,"jsonParse");let d,y,s,l,x,n,u;function $(){const e=s,r=[];if(p("{"),!N("}")){do r.push(Q());while(N(","));p("}")}return{kind:"Object",start:e,end:x,members:r}}t($,"parseObj");function Q(){const e=s,r=u==="String"?v():null;p("String"),p(":");const a=V();return{kind:"Member",start:e,end:x,key:r,value:a}}t(Q,"parseMember");function _(){const e=s,r=[];if(p("["),!N("]")){do r.push(V());while(N(","));p("]")}return{kind:"Array",start:e,end:x,values:r}}t(_,"parseArr");function V(){switch(u){case"[":return _();case"{":return $();case"String":case"Number":case"Boolean":case"Null":const e=v();return E(),e}p("Value")}t(V,"parseVal");function v(){return{kind:u,start:s,end:l,value:JSON.parse(d.slice(s,l))}}t(v,"curToken");function p(e){if(u===e){E();return}let r;if(u==="EOF")r="[end of file]";else if(l-s>1)r="`"+d.slice(s,l)+"`";else{const a=d.slice(s).match(/^.+?\b/);r="`"+(a?a[0]:d[s])+"`"}throw m(`Expected ${e} but found ${r}.`)}t(p,"expect");class L extends Error{constructor(r,a){super(r),this.position=a}}t(L,"JSONSyntaxError");function m(e){return new L(e,{start:s,end:l})}t(m,"syntaxError");function N(e){if(u===e)return E(),!0}t(N,"skip");function i(){return l<y&&(l++,n=l===y?0:d.charCodeAt(l)),n}t(i,"ch");function E(){for(x=l;n===9||n===10||n===13||n===32;)i();if(n===0){u="EOF";return}switch(s=l,n){case 34:return u="String",q();case 45:case 48:case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:return u="Number",C();case 102:if(d.slice(s,s+5)!=="false")break;l+=4,i(),u="Boolean";return;case 110:if(d.slice(s,s+4)!=="null")break;l+=3,i(),u="Null";return;case 116:if(d.slice(s,s+4)!=="true")break;l+=3,i(),u="Boolean";return}u=d[s],i()}t(E,"lex");function q(){for(i();n!==34&&n>31;)if(n===92)switch(n=i(),n){case 34:case 47:case 92:case 98:case 102:case 110:case 114:case 116:i();break;case 117:i(),g(),g(),g(),g();break;default:throw m("Bad character escape sequence.")}else{if(l===y)throw m("Unterminated string.");i()}if(n===34){i();return}throw m("Unterminated string.")}t(q,"readString");function g(){if(n>=48&&n<=57||n>=65&&n<=70||n>=97&&n<=102)return i();throw m("Expected hexadecimal digit.")}t(g,"readHex");function C(){n===45&&i(),n===48?i():w(),n===46&&(i(),w()),(n===69||n===101)&&(n=i(),(n===43||n===45)&&i(),w())}t(C,"readNumber");function w(){if(n<48||n>57)throw m("Expected decimal digit.");do i();while(n>=48&&n<=57)}t(w,"readDigits");D.registerHelper("lint","graphql-variables",(e,r,a)=>{if(!e)return[];let f;try{f=G(e)}catch(c){if(c instanceof L)return[O(a,c.position,c.message)];throw c}const{variableToType:o}=r;return o?I(a,o,f):[]});function I(e,r,a){var f;const o=[];for(const c of a.members)if(c){const h=(f=c.key)===null||f===void 0?void 0:f.value,b=r[h];if(b)for(const[j,P]of k(b,c.value))o.push(O(e,j,P));else o.push(O(e,c.key,`Variable "$${h}" does not appear in any GraphQL query.`))}return o}t(I,"validateVariables");function k(e,r){if(!e||!r)return[];if(e instanceof B)return r.kind==="Null"?[[r,`Type "${e}" is non-nullable and cannot be null.`]]:k(e.ofType,r);if(r.kind==="Null")return[];if(e instanceof H){const a=e.ofType;if(r.kind==="Array"){const f=r.values||[];return F(f,o=>k(a,o))}return k(a,r)}if(e instanceof J){if(r.kind!=="Object")return[[r,`Type "${e}" must be an Object.`]];const a=Object.create(null),f=F(r.members,o=>{var c;const h=(c=o==null?void 0:o.key)===null||c===void 0?void 0:c.value;a[h]=!0;const b=e.getFields()[h];if(!b)return[[o.key,`Type "${e}" does not have a field "${h}".`]];const j=b?b.type:void 0;return k(j,o.value)});for(const o of Object.keys(e.getFields())){const c=e.getFields()[o];!a[o]&&c.type instanceof B&&!c.defaultValue&&f.push([r,`Object of type "${e}" is missing required field "${o}".`])}return f}return e.name==="Boolean"&&r.kind!=="Boolean"||e.name==="String"&&r.kind!=="String"||e.name==="ID"&&r.kind!=="Number"&&r.kind!=="String"||e.name==="Float"&&r.kind!=="Number"||e.name==="Int"&&(r.kind!=="Number"||(r.value|0)!==r.value)?[[r,`Expected value of type "${e}".`]]:(e instanceof U||e instanceof z)&&(r.kind!=="String"&&r.kind!=="Number"&&r.kind!=="Boolean"&&r.kind!=="Null"||M(e.parseValue(r.value)))?[[r,`Expected value of type "${e}".`]]:[]}t(k,"validateValue");function O(e,r,a){return{message:a,severity:"error",type:"validation",from:e.posFromIndex(r.start),to:e.posFromIndex(r.end)}}t(O,"lintError");function M(e){return e==null||e!==e}t(M,"isNullish");function F(e,r){return Array.prototype.concat.apply([],e.map(r))}t(F,"mapCat");
