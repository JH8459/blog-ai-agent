export function slugify(input: string): string {
  const lowered = input.trim().toLowerCase();
  return lowered
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
