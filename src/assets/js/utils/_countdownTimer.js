import { DateTime } from "luxon";
import { _emitter } from "./_emitter";

export class _countdownTimer extends _emitter {
    constructor(props) {
        super(props.events);

        this.timeZone = props.timeZone ?? "Asia/Manila";

        // a luxon DateTime or an ISO string
        const _parsedDateTime = DateTime.isDateTime(props.dateTime) ? props.dateTime : props.dateTime ? DateTime.fromISO(props.dateTime) : null;
        this.dateTime = {
            target: _parsedDateTime && _parsedDateTime.isValid ? _parsedDateTime.setZone(this.timeZone).startOf("second") : null,
            now: null,
            diff: null,
            ended: false,
        };

        this.timeout = null;

        this.debug = props.debug ?? false;

        if (this.dateTime.target) this.init();
    }

    init() {
        this.emit("beforeInit");

        this.tick();

        this.emit("afterInit");
    }

    tick() {
        this.update();
        if (this.dateTime.ended) return;

        this.timeout = setTimeout(() => this.tick(), 1000 - (Date.now() % 1000) + 10);
    }

    update() {
        if (this.dateTime.ended) return;

        this.dateTime.now = DateTime.now().setZone(this.timeZone);
        this.dateTime.diff = this.dateTime.target.diff(this.dateTime.now, ["days", "hours", "minutes", "seconds"]).toObject();
        this.dateTime.diff = {
            days: Math.max(0, this.dateTime.diff.days),
            hours: Math.max(0, this.dateTime.diff.hours),
            minutes: Math.max(0, this.dateTime.diff.minutes),
            seconds: Math.max(0, Math.floor(this.dateTime.diff.seconds)),
        };

        if (this.dateTime.diff.days <= 0 && this.dateTime.diff.hours <= 0 && this.dateTime.diff.minutes <= 0 && parseInt(this.dateTime.diff.seconds) <= 0) {
            this.dateTime.ended = true;
            this.destroy();
        }

        this.emit("update");

        if (this.debug) console.log("_countdownTimer", this);
    }

    destroy() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.emit("end");
    }
}
