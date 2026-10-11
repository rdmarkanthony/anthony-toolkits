import { DateTime } from "luxon";
import flatpickr from "flatpickr";

import { _countdownTimer } from "../utils/_countdownTimer";
import { _rollingNumber } from "../utils/_rollingNumber";

// expose for inline scripts
Object.assign(window, { DateTime, flatpickr, _countdownTimer, _rollingNumber });
