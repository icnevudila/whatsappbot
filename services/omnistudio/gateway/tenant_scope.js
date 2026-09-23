'use strict';

function clean(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

// Tenant-scoped keys intentionally never collide with legacy display-name keys.
// A legacy caller retains its historical customer-name behaviour.
function getTenantScopeKey({ tenantId = null, orgId = null, conversationId = null, customer = '' } = {}) {
  const tenant = clean(tenantId || orgId);
  const conversation = clean(conversationId);
  const displayCustomer = clean(customer) || 'Genel';
  if (!tenant) return `legacy:customer:${displayCustomer}`;
  return conversation
    ? `tenant:${tenant}:conversation:${conversation}`
    : `tenant:${tenant}:customer:${displayCustomer}`;
}

function getRequestKey({ tenantId = null, orgId = null, requestId = null, operationType = '' } = {}) {
  const tenant = clean(tenantId || orgId);
  const request = clean(requestId);
  const operation = clean(operationType);
  return tenant && request && operation ? `tenant:${tenant}:request:${request}:operation:${operation}` : null;
}

module.exports = { getTenantScopeKey, getRequestKey };
