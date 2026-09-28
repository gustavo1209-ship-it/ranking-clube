import { getCurrentProfile } from '@/lib/current-profile'
import { Navbar } from '@/components/navbar'
import { BookOpen } from 'lucide-react'

interface RuleItemProps {
  n: number
  title: string
  children: React.ReactNode
}

function RuleItem({ n, title, children }: RuleItemProps) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-lime-500/15 text-lime-400 text-sm font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold">{title}</h3>
        <div className="text-sm text-gray-400 mt-1 space-y-2">{children}</div>
      </div>
    </div>
  )
}

function Example({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-gray-400 bg-gray-800/60 border border-gray-800 rounded-lg px-3 py-2">
      <span className="text-gray-300 font-medium">Exemplo: </span>
      {children}
    </p>
  )
}

function Section({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <p className="text-xs font-semibold tracking-wider text-lime-400 uppercase">{eyebrow}</p>
      <h2 className="text-xl font-heading font-bold text-white mt-1">{title}</h2>
      <p className="text-sm text-gray-500 mt-1.5 max-w-2xl">{intro}</p>
      <div className="mt-6 space-y-6 bg-gray-900 border border-gray-800 rounded-xl p-5 sm:p-6">{children}</div>
    </section>
  )
}

export default async function RegrasPage() {
  const profile = await getCurrentProfile()

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.full_name} isAdmin={profile?.is_admin} />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 text-lime-400">
          <BookOpen size={16} />
          <p className="text-xs font-semibold tracking-wider uppercase">Ranking · Sistema de escada</p>
        </div>
        <h1 className="text-3xl font-heading font-black text-white mt-2">Regulamento do Ranking de Tênis</h1>
        <p className="text-gray-400 mt-1">Caça e Pesca Veranópolis</p>
        <p className="text-sm text-gray-500 mt-4 max-w-2xl">
          Regras para desafios, movimentação da escada, prazos e realização das partidas, com um padrão único
          para todos os participantes.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            { n: '4', label: 'posições acima é o limite de cada desafio' },
            { n: '15', label: 'dias corridos para realizar a partida' },
            { n: '7', label: 'dias antes de uma revanche entre os mesmos jogadores' },
            { n: '2', label: 'dias sem desafiar após derrota do desafiante' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-2xl font-heading font-bold text-lime-400">{stat.n}</p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">{stat.label}</p>
            </div>
          ))}
        </div>

        <Section
          eyebrow="01 · Estrutura da escada"
          title="Como o ranking funciona"
          intro="A classificação é dinâmica: quem vence um desafio pode subir na escada, enquanto os demais jogadores são reposicionados conforme as regras abaixo."
        >
          <RuleItem n={1} title="Sistema de classificação">
            <p>
              O ranking funcionará no formato de <span className="text-gray-300 font-medium">escada</span>. Não
              haverá pontuação por vitória ou derrota: a classificação será determinada pela posição ocupada por
              cada jogador.
            </p>
          </RuleItem>
          <RuleItem n={2} title="Limite do desafio">
            <p>
              Cada jogador poderá desafiar qualquer adversário que esteja até{' '}
              <span className="text-gray-300 font-medium">4 posições acima</span> da sua colocação no momento em
              que o desafio for formalizado. Não é permitido desafiar jogadores abaixo da própria posição.
            </p>
            <Example>o 10º colocado poderá desafiar o 6º, 7º, 8º ou 9º colocados.</Example>
          </RuleItem>
          <RuleItem n={3} title="Vitória do desafiante">
            <p>
              Se o desafiante vencer, ele assume a posição do jogador desafiado. O desafiado e todos os jogadores
              que estavam entre ambos descem uma posição.
            </p>
            <Example>
              o 10º desafia o 6º e vence. O desafiante passa a 6º; o antigo 6º passa a 7º; o 7º a 8º; o 8º a 9º;
              e o 9º a 10º.
            </Example>
          </RuleItem>
          <RuleItem n={4} title="Vitória do desafiado">
            <p>
              Se o desafiado vencer, nenhuma posição será alterada. O desafiado poderá desafiar outro jogador
              imediatamente, respeitando o limite de quatro posições.
            </p>
          </RuleItem>
          <RuleItem n={5} title="Derrota do desafiante">
            <p>
              Se o desafiante perder, permanecerá em sua posição e ficará 2 dias completos sem poder realizar
              novo desafio. Durante esse período, poderá ser desafiado normalmente.
            </p>
          </RuleItem>
          <RuleItem n={6} title="Novo desafio após vitória">
            <p>
              Se o desafiante vencer, poderá realizar novo desafio imediatamente, já considerando sua nova
              posição na escada e novamente respeitando o limite de até quatro posições acima.
            </p>
          </RuleItem>
        </Section>

        <Section
          eyebrow="02 · Desafios e prazos"
          title="Agenda, revanche e desafios em andamento"
          intro="Os prazos existem para manter a escada em movimento sem prejudicar jogadores que tenham compromissos, viagens ou limitações pontuais de agenda."
        >
          <RuleItem n={7} title="Derrota na condição de desafiado">
            <p>
              O jogador que perder uma partida na condição de desafiado não recebe a penalidade de dois dias. Ele
              poderá desafiar outro jogador imediatamente, observada apenas a regra de revanche.
            </p>
          </RuleItem>
          <RuleItem n={8} title="Prazo para realização da partida">
            <p>
              A partida deverá ser disputada em até 15 dias corridos, contados da formalização do desafio no
              sistema oficial. Os jogadores deverão colaborar para encontrar data e horário dentro desse período.
            </p>
          </RuleItem>
          <RuleItem n={9} title="Desistência, recusa ou não realização">
            <p>
              Se o desafiado se recusar injustificadamente a jogar ou não apresentar disponibilidade razoável
              dentro dos 15 dias, será considerada vitória do desafiante por W.O., com a correspondente
              movimentação da escada.
            </p>
            <p>
              Se o desafiante desistir, não apresentar disponibilidade razoável ou for o responsável pela não
              realização, o desafio será cancelado, as posições serão mantidas e ele ficará 2 dias sem poder
              lançar novo desafio. Situações excepcionais serão avaliadas pela organização.
            </p>
          </RuleItem>
          <RuleItem n={10} title="Revanche">
            <p>
              Os mesmos dois jogadores somente poderão se enfrentar novamente pelo ranking após 7 dias completos,
              contados do encerramento da partida anterior, independentemente de quem tenha sido desafiante ou
              desafiado.
            </p>
          </RuleItem>
          <RuleItem n={11} title="Desafios simultâneos">
            <p>
              Cada jogador poderá ter apenas um desafio ativo como desafiante. Enquanto esse confronto estiver
              pendente, não poderá lançar outro desafio. O jogador poderá, entretanto, ser desafiado por terceiro
              jogador durante esse período, desde que os jogos possam ser realizados dentro dos respectivos
              prazos.
            </p>
            <p>
              Quando houver mais de um confronto pendente envolvendo o mesmo participante, os resultados
              produzirão efeitos na ordem cronológica em que as partidas forem concluídas e registradas.
            </p>
          </RuleItem>
          <RuleItem n={12} title="Validade do gap de quatro posições">
            <p>
              Para verificar se o desafio é permitido, será considerada a classificação existente no momento do
              registro oficial do desafio. Se o confronto era válido quando registrado, permanecerá válido mesmo
              que outros resultados alterem temporariamente a distância entre os jogadores antes da partida.
            </p>
          </RuleItem>

          <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg p-4">
            <p className="text-xs font-semibold tracking-wider text-lime-400 uppercase">Regra prática</p>
            <p className="text-sm text-gray-300 mt-1.5">
              O desafio &quot;trava&quot; sua validade no momento do registro. As posições podem mudar antes do
              jogo, mas um desafio regularmente lançado não é cancelado apenas porque a distância entre os
              participantes passou de quatro posições.
            </p>
          </div>
        </Section>

        <Section
          eyebrow="03 · Formalização e partidas"
          title="Como lançar e jogar um desafio"
          intro="Todos os confrontos seguem o mesmo fluxo e o mesmo formato de jogo. Isso evita dúvidas e garante tratamento uniforme entre os participantes."
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { n: '1', label: 'Informar', desc: 'O desafiante comunica o desafio no grupo oficial do WhatsApp.' },
              { n: '2', label: 'Registrar', desc: 'Depois, lança o desafio no sistema oficial do ranking.' },
              { n: '3', label: 'Jogar', desc: 'Os jogadores realizam a partida em até 15 dias corridos.' },
              { n: '4', label: 'Resultado', desc: 'O placar é lançado no sistema para atualização da escada.' },
            ].map(step => (
              <div key={step.n} className="bg-gray-800/60 border border-gray-800 rounded-lg p-3">
                <p className="text-xs font-semibold text-lime-400">{step.n} · {step.label}</p>
                <p className="text-xs text-gray-400 mt-1 leading-snug">{step.desc}</p>
              </div>
            ))}
          </div>

          <RuleItem n={13} title="Formalização dos desafios">
            <p>
              Para que o desafio tenha validade, ele deverá obrigatoriamente seguir duas etapas: primeiro, ser
              informado no grupo oficial do WhatsApp do ranking; em seguida, ser lançado no sistema oficial do
              ranking.
            </p>
            <p>
              Somente após o registro no sistema o desafio será considerado oficialmente formalizado,
              iniciando-se a contagem do prazo de 15 dias corridos. O anúncio no WhatsApp dá publicidade ao
              desafio, mas não substitui o registro no sistema.
            </p>
          </RuleItem>
          <RuleItem n={14} title="Formato obrigatório das partidas">
            <p>
              Todas as partidas deverão ser disputadas em 2 sets regulares. Em caso de empate em 1 set a 1, o
              jogo será decidido em super tie-break até 10 pontos, com diferença mínima de dois pontos.
            </p>
            <p>
              Nos dois sets regulares, aplica-se o formato tradicional: set até 6 games, com diferença mínima de
              dois; em 6-6, disputa-se tie-break. Não será permitido alterar esse formato por comum acordo entre
              os jogadores.
            </p>

            <div className="overflow-hidden rounded-lg border border-gray-800 mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800/80 text-gray-300">
                    <th className="text-left font-medium px-3 py-2">Etapa</th>
                    <th className="text-left font-medium px-3 py-2">Padrão do ranking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  <tr>
                    <td className="px-3 py-2 text-gray-400">1º set</td>
                    <td className="px-3 py-2 text-gray-400">Set regular; tie-break em 6-6.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-gray-400">2º set</td>
                    <td className="px-3 py-2 text-gray-400">Set regular; tie-break em 6-6.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-gray-400">Empate em sets</td>
                    <td className="px-3 py-2 text-gray-400">Super tie-break até 10 pontos, com diferença mínima de 2.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </RuleItem>
          <RuleItem n={15} title="Abandono após o início da partida">
            <p>
              Se um jogador abandonar a partida depois de iniciada, o adversário será considerado vencedor para
              fins do ranking. O resultado deverá indicar o placar disputado até o momento do abandono.
            </p>
          </RuleItem>
          <RuleItem n={16} title="Atraso e ausência">
            <p>
              Haverá tolerância de 15 minutos após o horário combinado. Ultrapassado esse prazo, sem comunicação
              ou acordo entre os jogadores, poderá ser aplicado W.O. Situações excepcionais poderão ser avaliadas
              pela organização.
            </p>
          </RuleItem>
        </Section>

        <Section
          eyebrow="04 · Participação e administração"
          title="Continuidade, conduta e resultado"
          intro="As regras finais tratam do agendamento, afastamentos, comportamento esportivo, atualização do sistema e situações não previstas no regulamento."
        >
          <RuleItem n={17} title="Responsabilidade pelo agendamento">
            <p>
              Cabe prioritariamente ao desafiante procurar o adversário e iniciar a combinação da data da
              partida. O desafiado deverá colaborar e apresentar disponibilidade razoável para que o confronto
              ocorra dentro dos 15 dias.
            </p>
          </RuleItem>
          <RuleItem n={18} title="Lesão, viagem ou afastamento prolongado">
            <p>
              O jogador que souber que ficará impossibilitado de jogar por período superior a 15 dias deverá
              comunicar a organização. Durante o afastamento, poderá ser colocado como temporariamente inativo,
              sem lançar ou receber novos desafios.
            </p>
            <p>
              O retorno e eventual reposicionamento serão definidos pela organização de forma a preservar o
              equilíbrio da escada e evitar vantagem decorrente da inatividade.
            </p>
          </RuleItem>
          <RuleItem n={19} title="Conduta esportiva">
            <p>
              Todos os participantes deverão manter comportamento compatível com um ranking recreativo e
              competitivo do clube, observando respeito ao adversário, boa-fé e espírito esportivo. Discussões
              sobre marcação de bolas, placar ou regras deverão ser resolvidas de forma esportiva; situações
              reiteradas poderão ser submetidas à organização.
            </p>
          </RuleItem>
          <RuleItem n={20} title="Registro do resultado">
            <p>
              O resultado deverá ser lançado no sistema oficial logo após o término da partida, preferencialmente
              pelo vencedor. A movimentação da escada ocorrerá com base no resultado registrado no sistema.
            </p>
            <p>
              Em caso de erro no lançamento ou divergência entre os jogadores, a organização poderá corrigir o
              resultado após conferência.
            </p>
          </RuleItem>
          <RuleItem n={21} title="Casos omissos">
            <p>
              Situações não previstas neste regulamento serão decididas pela organização, buscando preservar três
              princípios: mérito esportivo, continuidade da escada e igualdade de tratamento entre os
              participantes.
            </p>
          </RuleItem>

          <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg p-4">
            <p className="text-xs font-semibold tracking-wider text-lime-400 uppercase">Resumo essencial</p>
            <p className="text-sm text-gray-300 mt-1.5">
              Até 4 posições acima · 15 dias para jogar · 7 dias para revanche · 2 dias de bloqueio somente quando
              o desafiante perde. Venceu como desafiante ou desafiado? Pode lançar novo desafio imediatamente.
            </p>
          </div>
        </Section>

        <p className="text-xs text-gray-600 mt-8 max-w-2xl">
          <span className="text-gray-500 font-medium">Aplicação. </span>
          A participação no ranking pressupõe ciência e concordância com estas regras. Ajustes futuros poderão
          ser promovidos pela organização quando necessários ao bom funcionamento da competição.
        </p>
      </main>
    </div>
  )
}
