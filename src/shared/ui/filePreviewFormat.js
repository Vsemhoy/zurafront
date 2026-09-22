const textExtensions = new Set('txt log csv tsv json jsonc jsonl xml yml yaml toml ini cfg conf env gitignore md markdown mdx js mjs cjs jsx ts mts cts tsx php phtml cs py pyw c cpp cc cxx h hpp hxx rs rust go java kt kts swift rb sh bash zsh ps1 psm1 bat cmd sql css scss sass less html htm vue svelte dockerfile makefile r lua dart tex graphql proto'.split(' '));
const images = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon' };

export function filePreviewFormat(file) {
    const extension = file.name.toLowerCase().split('.').pop();
    if (['doc', 'docx', 'xls', 'xlsx', 'odt', 'ods', 'rtf'].includes(extension)) return { kind: 'office', mime: 'application/pdf' };
    if (file.mime === 'application/pdf' || extension === 'pdf') return { kind: 'pdf', mime: 'application/pdf' };
    if (images[extension] || Object.values(images).includes(file.mime)) return { kind: 'image', mime: images[extension] || file.mime };
    if (['md', 'markdown'].includes(extension)) return { kind: 'markdown' };
    if (textExtensions.has(extension) || file.mime?.startsWith('text/') || ['application/json', 'application/xml', 'application/javascript'].includes(file.mime)) return { kind: 'text' };
    return { kind: 'unsupported' };
}
