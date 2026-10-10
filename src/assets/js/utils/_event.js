export const _event = {
  resize(callback) {
    let _resizeTimer = "";

    callback("init");

    window.addEventListener("load", (e) => {
      callback("ready", e);
    });

    window.addEventListener("resize", (e) => {
      callback("resize", e);

      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(() => {
        callback("after", e);
      }, 300);
    });
  },
  scroll(callback) {
    callback();
    window.addEventListener("scroll", (e) => {
      callback(e);
    });
  },
  dispatch(elem, eventName) {
    let event;
    if (typeof Event === "function") {
      event = new Event(eventName);
    } else {
      event = document.createEvent("Event");
      event.initEvent(eventName, true, true);
    }
    elem.dispatchEvent(event);
  },
  width() {
    return (
      window.innerWidth -
      (window.innerWidth - document.documentElement.clientWidth)
    );
  },
  height(type) {
    if (type === "document") return document.documentElement.scrollHeight;
    return (
      window.innerHeight -
      (window.innerHeight - document.documentElement.clientHeight)
    );
  },
};
