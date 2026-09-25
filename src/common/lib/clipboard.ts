/**
 * Copies text to the clipboard. `navigator.clipboard` only exists in secure contexts (HTTPS or
 * localhost), so on plain http://<LAN IP> this falls back to a hidden textarea + execCommand.
 */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (!document.execCommand('copy')) throw new Error('Copy command was rejected');
  } finally {
    textarea.remove();
  }
}
