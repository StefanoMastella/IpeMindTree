#!/usr/bin/env node

/**
 * Script para verificar se o ambiente está configurado corretamente
 * Uso: node check-environment.js
 */

import { config } from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;
import { execSync } from 'child_process';

// Carregar variáveis de ambiente
config();

const requiredEnvVars = [
  'DATABASE_URL',
  'GEMINI_API_KEY',
  'NODE_ENV'
];

const optionalEnvVars = [
  'OPENAI_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'VITE_GEMINI_API_KEY'
];

async function checkEnvironment() {
  console.log('🔍 Verificando configuração do ambiente...\n');
  
  let hasErrors = false;
  
  // Verificar variáveis obrigatórias
  console.log('📋 Variáveis de ambiente obrigatórias:');
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value || value.includes('your_') || value.includes('sua_')) {
      console.log(`  ❌ ${envVar}: Não configurada ou usando valor placeholder`);
      hasErrors = true;
    } else {
      console.log(`  ✅ ${envVar}: Configurada`);
    }
  }
  
  // Verificar variáveis opcionais
  console.log('\n📋 Variáveis de ambiente opcionais:');
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar];
    if (!value || value.includes('your_') || value.includes('sua_')) {
      console.log(`  ⚠️  ${envVar}: Não configurada (opcional)`);
    } else {
      console.log(`  ✅ ${envVar}: Configurada`);
    }
  }
  
  // Testar conexão com banco
  console.log('\n🗄️  Testando conexão com banco de dados...');
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    
    await client.connect();
    
    // Verificar se as tabelas existem
    const result = await client.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    
    const tableCount = parseInt(result.rows[0].table_count);
    
    if (tableCount > 0) {
      console.log(`  ✅ Banco conectado com sucesso (${tableCount} tabelas encontradas)`);
    } else {
      console.log('  ⚠️  Banco conectado, mas nenhuma tabela encontrada');
      console.log('     Execute: node setup-database.js');
    }
    
    await client.end();
    
  } catch (error) {
    console.log(`  ❌ Erro ao conectar com banco: ${error.message}`);
    hasErrors = true;
  }
  
  // Verificar se o build funciona
  console.log('\n🔨 Verificando build de produção...');
  try {
    execSync('npm run build', { stdio: 'pipe' });
    console.log('  ✅ Build de produção funcionando');
  } catch (error) {
    console.log('  ❌ Erro no build de produção');
    hasErrors = true;
  }
  
  // Resultado final
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ Ambiente NÃO está pronto para produção');
    console.log('\n📝 Próximos passos:');
    console.log('1. Configure as variáveis de ambiente faltantes');
    console.log('2. Execute setup-database.js se necessário');
    console.log('3. Execute este script novamente');
    process.exit(1);
  } else {
    console.log('🎉 Ambiente PRONTO para produção!');
    console.log('\n📝 Próximos passos:');
    console.log('1. Fazer deploy no Railway');
    console.log('2. Configurar domínio personalizado');
    console.log('3. Testar aplicação em produção');
  }
}

checkEnvironment().catch(console.error);