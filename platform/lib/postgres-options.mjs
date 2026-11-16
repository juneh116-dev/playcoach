import {rootCertificates} from 'node:tls';
import supabaseCA from './supabase-ca.json' with {type: 'json'};

export function postgresOptions(connectionString) {
  const url = new URL(connectionString);
  if (!url.hostname.endsWith('.supabase.co') && !url.hostname.endsWith('.supabase.com')) {
    return {connectionString};
  }
  // pg connection-string SSL parameters override the explicit ssl option.
  // Use the provider's public CA without disabling hostname/certificate checks.
  for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat']) url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: {rejectUnauthorized: true, ca: [...rootCertificates, supabaseCA]},
  };
}
