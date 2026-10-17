// demo for _load.script([...]), needs greet.js to run first
window.greetLoud = ((greet) => (name) => greet(name).toUpperCase())(window.greet);
