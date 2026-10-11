import { _inview } from "../utils/_inview";
import { _splitText } from "../utils/_splitText";
import { _animate } from "../utils/_animate";

// expose for inline scripts
Object.assign(window, { _inview, _splitText, _animate });
