import { createRoot } from 'react-dom/client';
import {
  dezSombrasQaEnvironmentAllowed,
  dezSombrasQaOriginAllowed,
} from '../lib/qa/dezSombrasQaGate';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento raiz do QA não encontrado.');

const permitido = dezSombrasQaEnvironmentAllowed(
  import.meta.env.DEV,
  import.meta.env.VITE_DEZ_SOMBRAS_QA,
) && dezSombrasQaOriginAllowed(window.location.hostname, window.location.port);

function Restrito() {
  return (
    <main className="container">
      <h1>Área indisponível</h1>
      <p>Este painel só abre no servidor local de QA iniciado pelo launcher do projeto.</p>
    </main>
  );
}

function PainelQa() {
  return (
    <main className="container">
      <header className="hero">
        <p className="eyebrow">Ambiente local isolado · 127.0.0.1:5181</p>
        <h1>QA — Dez Sombras</h1>
        <p>O painel é informativo. A validação de combate roda em Vitest com fixtures descartáveis e controladores reais.</p>
      </header>

      <section className="card" aria-labelledby="isolation-title">
        <h2 id="isolation-title">Limites do ambiente</h2>
        <ul>
          <li>Aplicação Vite independente, sem o roteador, a raiz visual ou os stores do site.</li>
          <li>Escuta apenas em <code>127.0.0.1:5181</code>, com falha se a porta já estiver ocupada; não compartilha a origem de <code>localhost:5180</code>.</li>
          <li>Não importa controladores, autenticação, Supabase, localStorage ou IndexedDB. Não contém botões que executem ações de campanha.</li>
          <li>Não carrega fontes, imagens ou scripts de terceiros.</li>
        </ul>
      </section>

      <section className="card" aria-labelledby="coverage-title">
        <h2 id="coverage-title">Cobertura automatizada</h2>
        <p>Execute a suíte focada na raiz do projeto:</p>
        <pre><code>npm run test:dez-sombras</code></pre>
        <ul>
          <li>Os perfis identificados, ataques, agarrão do Sapo, cura, Torrente do Elefante e Investida do Touro percorrem controladores reais com rolagens determinísticas.</li>
          <li>Há cenários de combate para Totalidade, Abismo e Agito, além do ciclo de invocação e regressões de mapa/autonomia/horda.</li>
          <li>Robustez verifica PV do perfil e das instâncias/tokens criados ao invocar Elefante Máximo e Mahoraga.</li>
          <li>São cenários selecionados com personagens e mapas sintéticos; não representam todas as combinações possíveis nem um aceite visual ao vivo no portal principal.</li>
        </ul>
      </section>

      <section className="card" aria-labelledby="rules-title">
        <h2 id="rules-title">Arbitragem manual preservada</h2>
        <p>O material-fonte deixa parâmetros operacionais em aberto. O módulo mantém esses efeitos sem execução automática até o Mestre decidir:</p>
        <ul>
          <li>Alcateia dos Cães e da Totalidade: o referente do bônus não identifica com clareza quem o recebe.</li>
          <li>Nue e Abismo: a fonte informa voo e deslocamento, mas não fecha altitude, manobras, queda ou procedimento de Montaria.</li>
          <li>Sapo: Arremessar publica dano e Caída na falha, mas não define a fórmula do TR, dano no sucesso nem todas as validações de destino; Fora de Risco deixa empate e deslocamento sem consentimento em aberto.</li>
          <li>Grande Serpente: Entrelaçar não fecha alcance, limite de tamanho ou economia exata da fuga.</li>
          <li>Elefante Máximo: Defesa Alternativa por Constituição não traz fórmula de recálculo; a geometria da Torrente exige decisão no mapa.</li>
          <li>Cervo Circular: Fluxo Reverso não especifica seleção de objetos nem aplicação geral do bônus situacional.</li>
          <li>Touro: Movimento Alternativo não fornece fórmula para recalcular deslocamento por Força.</li>
          <li>Mahoraga: adaptações não definem integralmente início, duração, escopo por alvo/tipo e reinício dos contadores.</li>
          <li>Tigre Fúnebre: perfil especulativo opcional; Arauto do Funeral ainda não bloqueia cura no combate.</li>
          <li>Abismo: Grupo não modela PV e ordem de perda dos três sapos como unidades individuais. Agito mantém cura e regeneração superior manuais onde custo/gatilhos não bastam para automação.</li>
          <li>Estoque, Ocultação, Passo Sombrio, Fuga do Coelho e Jardim das Sombras Sobrepostas têm lacunas de seleção, geometria, duração ou execução e seguem sem resolução automática.</li>
        </ul>
        <p className="note">A Enciclopédia anuncia dez shikigamis e menciona o Tigre Fúnebre, mas não publica uma ficha mecânica canônica para ele nem declara literalmente que essa menção é o ordinal décimo.</p>
      </section>
    </main>
  );
}

createRoot(root).render(permitido ? <PainelQa /> : <Restrito />);