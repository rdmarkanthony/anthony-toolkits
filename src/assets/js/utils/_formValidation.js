import { _emitter } from "./_emitter";

// usage: new _formValidation({ target: form, live, rules, messages, events })
// checks the native attributes (required, type, pattern, minlength, min, max...) plus your rules, the form gets novalidate
// a field checks on blur once it has a value, then on each input, all of them on submit; live: true checks on input from the start
// input gets aria-invalid, its .js-field wrapper data-invalid/data-valid, a .js-field-error inside it the message (all optional, events work without)
// rules: { selector: (input, form) => true or a message }, messages: { valueMissing: "..." } or per input data-message-value-missing="..."
const _keys = ["valueMissing", "typeMismatch", "badInput", "patternMismatch", "tooShort", "tooLong", "rangeUnderflow", "rangeOverflow", "stepMismatch", "customError"];

const _messages = {
    valueMissing: (input) => (input.type === "checkbox" ? "Please tick this box." : input.type === "radio" || input.tagName === "SELECT" ? "Please choose one." : "This field is required."),
    typeMismatch: (input) => (input.type === "email" ? "Enter a valid email address." : input.type === "url" ? "Enter a valid link, with https://." : "Enter a valid value."),
    badInput: () => "Enter a number.",
    patternMismatch: (input) => input.title || "Use the format asked for.",
    tooShort: (input) => `Use at least ${input.minLength} characters.`,
    tooLong: (input) => `Use at most ${input.maxLength} characters.`,
    rangeUnderflow: (input) => `Use ${input.min} or more.`,
    rangeOverflow: (input) => `Use ${input.max} or less.`,
    stepMismatch: () => "Use a valid value.",
    customError: (input) => input.validationMessage,
};

let _count = 0;

export class _formValidation extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.live = props.live ?? false;
        this.rules = props.rules ?? {};
        this.messages = { ..._messages, ...props.messages };

        this.field = null;
        this.message = "";
        this.invalid = [];
        this.event = null;

        this.checked = new WeakSet();
        this.shown = new WeakMap();
        this.errors = new Map();
        this.abort = new AbortController();

        if (this.target) this.init();
    }

    init() {
        const { signal } = this.abort;

        this.target.noValidate = true;

        this.target.addEventListener(
            "input",
            (e) => {
                const _input = this.fieldOf(e.target);
                if (!_input) return;

                this.errors.delete(_input);
                if (this.live || this.checked.has(_input)) this.validate(_input);
                this.recheck(_input);
            },
            { signal }
        );

        this.target.addEventListener("change", (e) => this.isChoice(e.target) && this.fieldOf(e.target) && this.validate(e.target), { signal });
        this.target.addEventListener(
            "focusout",
            (e) => {
                const _input = this.fieldOf(e.target);
                if (_input && !this.isChoice(_input) && (_input.value || this.checked.has(_input))) this.validate(_input);
            },
            { signal }
        );

        this.target.addEventListener("submit", (e) => this.submit(e), { signal });
        this.target.addEventListener("reset", () => this.reset(), { signal });
    }

    fields() {
        return [...this.target.elements].filter((el) => el.willValidate && !["submit", "button", "reset"].includes(el.type));
    }

    fieldOf(element) {
        return this.fields().includes(element) ? element : null;
    }

    isChoice(input) {
        return ["checkbox", "radio"].includes(input.type) || input.tagName === "SELECT";
    }

    group(input) {
        return input.type === "radio" && input.name ? this.fields().filter((el) => el.type === "radio" && el.name === input.name) : [input];
    }

    messageFor(input) {
        const _validity = input.validity;
        const _key = _keys.find((key) => _validity[key]);
        if (!_key) return "";

        const _data = input.dataset[`message${_key[0].toUpperCase()}${_key.slice(1)}`] ?? (_key !== "customError" ? input.dataset.message : null);
        if (_data) return _data;

        const _message = this.messages[_key];
        return typeof _message === "function" ? _message(input) : _message;
    }

    validate(input) {
        const _group = this.group(input);
        _group.forEach((el) => this.checked.add(el));

        let _custom = this.errors.get(input) ?? "";
        if (!_custom) {
            for (const selector in this.rules) {
                if (!input.matches(selector)) continue;
                const _result = this.rules[selector](input, this.target);
                if (_result !== true) {
                    _custom = _result || "Check this field.";
                    break;
                }
            }
        }
        _group.forEach((el) => el.setCustomValidity(_custom));

        const _message = this.messageFor(input);
        const _changed = this.shown.get(input) !== _message;

        this.show(input, _message);

        if (_changed) {
            this.field = input;
            this.message = _message;
            this.emit(_message ? "invalid" : "valid");
        }

        return !_message;
    }

    recheck(changed) {
        this.fields().forEach((input) => {
            if (input === changed || !this.checked.has(input)) return;
            if (Object.keys(this.rules).some((selector) => input.matches(selector))) this.validate(input);
        });
    }

    show(input, message) {
        this.group(input).forEach((el) => {
            el.setAttribute("aria-invalid", message ? "true" : "false");
            this.shown.set(el, message);
        });

        const _wrap = input.closest(".js-field");
        _wrap?.toggleAttribute("data-invalid", !!message);
        _wrap?.toggleAttribute("data-valid", !message);

        const _error = _wrap?.querySelector(".js-field-error");
        if (!_error) return;

        _error.id ||= `field-error-${++_count}`;
        _error.textContent = message;
        _error.hidden = !message;

        this.group(input).forEach((el) => {
            const _ids = (el.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
            if (!_ids.includes(_error.id)) el.setAttribute("aria-describedby", [..._ids, _error.id].join(" "));
        });
    }

    validateAll() {
        const _seen = new Set();
        this.invalid = [];

        this.fields().forEach((input) => {
            const _key = input.type === "radio" && input.name ? `radio:${input.name}` : input;
            if (_seen.has(_key)) return;
            _seen.add(_key);

            if (!this.validate(input)) this.invalid.push(input);
        });

        return !this.invalid.length;
    }

    submit(e) {
        this.event = e;

        if (this.validateAll()) return this.emit("submit");

        e.preventDefault();
        this.invalid[0].focus();
        this.emit("error");
    }

    // e.g. "Email is taken" from the server, it goes once they edit the field
    setError(input, message) {
        this.errors.set(input, message);
        this.validate(input);
    }

    clear(input) {
        this.errors.delete(input);
        this.group(input).forEach((el) => {
            this.checked.delete(el);
            el.setCustomValidity("");
            el.removeAttribute("aria-invalid");
            this.shown.delete(el);
        });

        const _wrap = input.closest(".js-field");
        _wrap?.removeAttribute("data-invalid");
        _wrap?.removeAttribute("data-valid");

        const _error = _wrap?.querySelector(".js-field-error");
        if (_error) {
            _error.textContent = "";
            _error.hidden = true;
        }
    }

    reset() {
        this.fields().forEach((input) => this.clear(input));
        this.invalid = [];
        this.emit("reset");
    }

    destroy() {
        this.abort.abort();
        this.reset();
        this.target.noValidate = false;
    }
}
