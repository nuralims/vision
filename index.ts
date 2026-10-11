/**
 * @getpipher/vision root entry point.
 * Chains both vision.ts (tool + commands) and paste.ts (clipboard input hook).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import visionExtension from "./extensions/vision.ts";
import pasteExtension from "./extensions/paste.ts";

export default function (pi: ExtensionAPI) {
  visionExtension(pi);
  pasteExtension(pi);
}
