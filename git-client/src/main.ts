import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import naive from "./plugins/naive";
import i18n from "./i18n";
import "./assets/styles/main.css";
import "./assets/styles/themes/dark.css";
import "./assets/styles/themes/light.css";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";


monaco.typescript.typescriptDefaults.setEagerModelSync(true);

window.MonacoEnvironment = {
  // 提供一个定义worker路径的全局变量
  getWorker(_: any, label: string) {
    if (label === "json") {
      return new jsonWorker();
    }
    if (label === "typescript" || label === "javascript") {
      return new tsWorker();
    }
    if (label === "css") {
      return new cssWorker();
    }
    if (label === "html") {
      return new htmlWorker();
    }
    return new editorWorker();
  },
};

const app = createApp(App);
app.use(createPinia());
app.use(naive);
app.use(i18n);
app.mount("#app");
