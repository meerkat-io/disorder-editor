<template>
    <table :class="tblClass" ref="arrayTable">
      <thead v-if="headers.length > 0" :class="theadClass" >
        <tr :class="trClass">
          <th
            v-for="{ header, resize, thClass } in headers"
            :key="header"
            :class="thClass"
            :style="{ minWidth: colWidth[header], width: colWidth[header] }"
            :ref="header"
          >
            <slot name="header" :hdr="header" />
            <div
              v-if="!(resize === false)"
              class="resizer"
              :style="{ height: tableHeight }"
              @mousedown="resizeCol( header, $event )"
              @dblclick="resetColSize( header )"
              ></div>
          </th>
        </tr>
      </thead>
      <tbody>
        <slot name="body" />
      </tbody>
    </table>
  </template>