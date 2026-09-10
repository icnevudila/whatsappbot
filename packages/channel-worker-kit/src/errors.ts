/** Timeout / belirsiz gönderim — asla otomatik retry yok (çift mesaj riski). */
export class DeliveryUncertainError extends Error {
  constructor(
    message = 'Gönderim sonucu doğrulanamadı. Çift mesajı önlemek için otomatik tekrar yapılmadı.',
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'DeliveryUncertainError'
  }
}

/** İşlem sonrası veya bilinçli kalıcı hata — retry yok. */
export class NonRetryableJobError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'NonRetryableJobError'
  }
}

/**
 * Gönderim promise’ini timeout ile sarar.
 * Timeout veya belirsiz hata → DeliveryUncertainError (retry yok).
 */
export async function awaitDelivery<T>(operation: Promise<T>, timeoutMs: number): Promise<NonNullable<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new DeliveryUncertainError()), timeoutMs)
      }),
    ])
    if (result === null || result === undefined) throw new DeliveryUncertainError()
    return result as NonNullable<T>
  } catch (error) {
    if (error instanceof DeliveryUncertainError) throw error
    const code =
      (error as { output?: { statusCode?: number }; statusCode?: number } | null)?.output?.statusCode ??
      (error as { statusCode?: number } | null)?.statusCode
    // Explicit rejections (örn. 403/463) belirsizlik taşımıyor.
    if (code === 403 || code === 463) throw error
    throw new DeliveryUncertainError(undefined, { cause: error })
  } finally {
    if (timer) clearTimeout(timer)
  }
}
