/**
 * Google Flow Driver v2 - Hata Hiyerarşisi
 * 
 * Upstream Referansları:
 * - miyakejima/google-flow-mcp/src/errors.ts (Commit: 6826452a4a2e93bf7313d1be1626a9034fd7dc27)
 * - DiegoLopez0208/google-flow-skill/flow_provider/api.py (Commit: ccd24a316b37ea43b208dc5fb72d3dc47c7dd6cc)
 * 
 * Fail-closed mimari: Tahmini / fuzzy fallback yasaktır.
 */

class FlowDriverError extends Error {
  constructor(code, message, details = {}) {
    super(`[${code}] ${message}`);
    this.name = 'FlowDriverError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Flow batchexecute RPC (jHPbke, ngNC2, as29s) yanıt formatı veya imzası değiştiğinde fırlatılır.
 * ASLA fuzzy fallback (son proje, latest.mp4 vb.) KULLANILMAZ.
 */
class FlowRpcChangedError extends FlowDriverError {
  constructor(rpcid, rawResponse, context = {}) {
    super(
      'FLOW_RPC_CHANGED',
      `Flow batchexecute RPC '${rpcid}' yanıtı beklenen şemaya uymadı. Google iç API'si güncellenmiş olabilir.`,
      { rpcid, responseSnippet: String(rawResponse || '').slice(0, 500), ...context }
    );
  }
}

/**
 * Tanınmayan veya beklenmeyen bir overlay / modal arayüzü kilitlediğinde fırlatılır.
 * Tahmini tıklama yapılmaz; kanıt snapshot'ları (ekran görüntüsü, HTML dökümü) kaydedilir.
 */
class FlowUiChangedError extends FlowDriverError {
  constructor(reason, diagnostic = {}) {
    super(
      'FLOW_UI_CHANGED',
      `Flow arayüzünde tanınmayan engel veya yapısal değişiklik: ${reason}`,
      diagnostic
    );
  }
}

/**
 * Model günlük kullanım kotasına ulaştığında fırlatılır. Kredi düşmez.
 */
class FlowUsageLimitReachedError extends FlowDriverError {
  constructor(modelName, accountId) {
    super(
      'FLOW_LIMIT_REACHED',
      `Model '${modelName}' kullanım kotasına ulaştı. Flow bu denemeden kredi düşmediğini bildiriyor.`,
      { modelName, accountId }
    );
  }
}

/**
 * Oturum süresi dolduğunda veya Google oturum açma sayfasına yönlendirdiğinde fırlatılır.
 */
class FlowSessionExpiredError extends FlowDriverError {
  constructor(accountId, details = {}) {
    super(
      'FLOW_SESSION_EXPIRED',
      `Flow hesabı '${accountId}' oturumu sona erdi veya oturum çerezleri geçersiz.`,
      { accountId, ...details }
    );
  }
}

/**
 * Güvenlik Invariant zincirinde herhangi bir halka doğrulanamadığında fırlatılır.
 * COMPLETED durumu verilmesi KESİNLİKLE YASAKTIR.
 */
class FlowInvariantError extends FlowDriverError {
  constructor(brokenLink, expected, actual, invariantChain = {}) {
    super(
      'FLOW_INVARIANT_BROKEN',
      `Güvenlik Invariant zinciri ihlali (${brokenLink}). Beklenen: ${expected}, Gerçek: ${actual}`,
      { brokenLink, expected, actual, invariantChain }
    );
  }
}

module.exports = {
  FlowDriverError,
  FlowRpcChangedError,
  FlowUiChangedError,
  FlowUsageLimitReachedError,
  FlowSessionExpiredError,
  FlowInvariantError
};
