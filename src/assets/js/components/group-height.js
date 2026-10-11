import { _groupHeight } from "../utils/_groupHeight";

// expose for inline scripts
Object.assign(window, { _groupHeight });

// for [data-gh-parent] and [data-rgh-parent]
_groupHeight.init();
