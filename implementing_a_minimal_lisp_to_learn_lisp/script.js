const WASM = WebAssembly.compileStreaming(fetch('https://random-dev.lancelot.life/lisp/lisp_interpreter.wasm'))

const InitLisp = async (lisp_log_function) => {
  let log_str_wasm = () => console.error("log_str_memory isn't set yet")
  
  const importObject = {
    imports: {
      log_str: (test) => log_str_wasm(test)
    },
  };

  const exports = await WASM
    .then(module => WebAssembly.instantiate(module, importObject))
    .then((instance) => {
    log_str_wasm = function(ptr) {
      let memory_array = new Uint8Array(instance.exports.memory.buffer);
  
      let i = 0;
      for (;memory_array[ptr + i] != 0; i += 1);

      lisp_log_function(new TextDecoder("utf-8").decode(memory_array.slice(ptr, ptr + i)));
    };

    return instance.exports;
  });

  return function(lispProgram) {
    const { execute_bytes_array, allocateUint8Array } = exports;
    const paramArrayJS = new TextEncoder("utf-8").encode(lispProgram);

    paramPtr = allocateUint8Array(paramArrayJS.length);
    paramWasmArray = new Uint8Array(exports.memory.buffer, paramPtr, paramArrayJS.length);
    paramWasmArray.set(paramArrayJS);
  
    execute_bytes_array(paramPtr, paramArrayJS.length);
  };
}


function changeTag(node, newTag) {
  const frag = document.createDocumentFragment();

  while (node.firstChild) {
    frag.appendChild(node.firstChild);
  }

  const element = document.createElement(newTag);
  element.appendChild(frag);

  node.parentNode.replaceChild(element, node);
}

WASM.then(() => {
  Array.from(document.querySelectorAll("pre.mini-lisp")).map((preElem) => {
    const preContainer = document.createElement("div");
    preContainer.classList.add("preContainer");
    preContainer.appendChild(preElem.cloneNode(true));
    preElem.parentNode.replaceChild(preContainer, preElem);
  
    const lispPreElem = preContainer.firstChild;
  
    const control_buttons = document.createElement("div");
  
    control_buttons.classList.add("control_buttons");
    control_buttons.classList.add("start");
  
    lispPreElem.appendChild(control_buttons);
  
    let response;
    function startEditListener(event) {
      if (lispPreElem.contains(event.target) && !control_buttons.contains(event.target)) {
        const height = lispPreElem.firstChild.clientHeight;
        changeTag(lispPreElem.firstChild, "textarea");
        lispPreElem.firstChild.style.height = height + 'px';
        document.removeEventListener('click', startEditListener);
        document.addEventListener('click', endEditListener);
        lispPreElem.firstChild.focus();
      }
    }
  
    function endEditListener(event) {
      if (!event || !lispPreElem.contains(event.target)) {
        const code = lispPreElem.firstChild.value;
        const codeElement = document.createElement("code");
        const textAreaElement = lispPreElem.firstChild;
  
        codeElement.appendChild(document.createTextNode(code));
        lispPreElem.replaceChild(codeElement, textAreaElement);
  
        document.removeEventListener('click', endEditListener);
        document.addEventListener('click', startEditListener);
      }
    }
  
    function startInterpreter(event) {
      if (lispPreElem.firstChild.tagName == 'TEXTAREA') {
        endEditListener();
      }
      if (!response) {
        response = document.createElement("div");
        response.classList.add("response");
        preContainer.appendChild(response);
      }
  
      response.innerText = "";
      InitLisp((output) => {
        response.appendChild(document.createTextNode(`${output}\n`));
      }).then((Lisp) => {
        Lisp(lispPreElem.firstChild.firstChild.data);
      }).catch((err) => {
        if (err.message != "unreachable executed") {
          response.appendChild(document.createTextNode(`Runtime error: ${err.message}`));
        }
      });
    }
  
    control_buttons.addEventListener('click', startInterpreter);
  
    document.addEventListener('click', startEditListener);
  });
});
