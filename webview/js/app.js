(()=>{"use strict";var e={473:(e,t,s)=>{var a=s(751),r=s(641),o=s(953);const l=0,n=1,c={__name:"App",setup(e){const t=acquireVsCodeApi(),s=(0,o.KR)(0),a=(0,o.KR)("empty"),c=(0,o.KR)([]);function u(e){switch(console.log("receiveMessage",e),e.command){case"select_schema":s.value=l,a.value=e.body;break;case"select_message":s.value=n,c.value=e.body;break}}return(0,r.sV)(window.addEventListener("message",(e=>u(e.data)))),t.postMessage({command:"ready"}),(e,u)=>{const i=(0,r.g2)("schema-selector"),m=(0,r.g2)("message-selector");return s.value==l?((0,r.uX)(),(0,r.Wv)(i,{key:0,onSelect:u[0]||(u[0]=e=>(0,o.R1)(t).postMessage({command:"schema",body:e})),status:a.value},null,8,["status"])):s.value==n?((0,r.uX)(),(0,r.Wv)(m,{key:1,onSelect:u[1]||(u[1]=e=>(0,o.R1)(t).postMessage({command:"message",body:e})),messages:c.value},null,8,["messages"])):(0,r.Q3)("",!0)}}},u=c,i=u,m=(0,r.Lk)("br",null,null,-1),p={key:0},d={key:1},v={__name:"SchemaSelector",props:{status:String},emits:["select"],setup(e,{emit:t}){const s=t;function a(e){const t=e.target.files[0];null!=t&&(console.log("select schema:",t.path),s("select",t.path))}return(t,s)=>((0,r.uX)(),(0,r.CE)(r.FK,null,[(0,r.Lk)("input",{ref:"upload",type:"file",name:"upload",accept:".yaml, .yml",onChange:a},null,544),m,"empty"==e.status?((0,r.uX)(),(0,r.CE)("label",p,"Select schema file (yaml)")):(0,r.Q3)("",!0),"invalid"==e.status?((0,r.uX)(),(0,r.CE)("label",d,"Schema file is invalid, select a valid file instead")):(0,r.Q3)("",!0)],64))}},f=v,g=f;var h=s(33);const y={__name:"MessageSelector",props:{messages:{type:Array}},emits:["select"],setup(e,{emit:t}){return(t,s)=>((0,r.uX)(),(0,r.CE)("label",null,(0,h.v_)(e.messages.length),1))}},b=y,k=b,w=(0,a.Ef)(i);w.component("SchemaSelector",g),w.component("MessageSelector",k),w.mount("#app")}},t={};function s(a){var r=t[a];if(void 0!==r)return r.exports;var o=t[a]={exports:{}};return e[a](o,o.exports,s),o.exports}s.m=e,(()=>{var e=[];s.O=(t,a,r,o)=>{if(!a){var l=1/0;for(i=0;i<e.length;i++){for(var[a,r,o]=e[i],n=!0,c=0;c<a.length;c++)(!1&o||l>=o)&&Object.keys(s.O).every((e=>s.O[e](a[c])))?a.splice(c--,1):(n=!1,o<l&&(l=o));if(n){e.splice(i--,1);var u=r();void 0!==u&&(t=u)}}return t}o=o||0;for(var i=e.length;i>0&&e[i-1][2]>o;i--)e[i]=e[i-1];e[i]=[a,r,o]}})(),(()=>{s.d=(e,t)=>{for(var a in t)s.o(t,a)&&!s.o(e,a)&&Object.defineProperty(e,a,{enumerable:!0,get:t[a]})}})(),(()=>{s.g=function(){if("object"===typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"===typeof window)return window}}()})(),(()=>{s.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t)})(),(()=>{var e={524:0};s.O.j=t=>0===e[t];var t=(t,a)=>{var r,o,[l,n,c]=a,u=0;if(l.some((t=>0!==e[t]))){for(r in n)s.o(n,r)&&(s.m[r]=n[r]);if(c)var i=c(s)}for(t&&t(a);u<l.length;u++)o=l[u],s.o(e,o)&&e[o]&&e[o][0](),e[o]=0;return s.O(i)},a=self["webpackChunkdisorder_editor"]=self["webpackChunkdisorder_editor"]||[];a.forEach(t.bind(null,0)),a.push=t.bind(null,a.push.bind(a))})();var a=s.O(void 0,[504],(()=>s(473)));a=s.O(a)})();
//# sourceMappingURL=app.js.map