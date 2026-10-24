// Node yükleyici kancası: uzantısız göreli içe aktarmalara .js ekler (Metro gibi). tools/tahta/uret.mjs kullanır.
export async function resolve(spec, ctx, next) {
  try {
    return await next(spec, ctx);
  } catch (e) {
    if (spec.startsWith('.') && !/\.\w+$/.test(spec)) return next(spec + '.js', ctx);
    throw e;
  }
}
