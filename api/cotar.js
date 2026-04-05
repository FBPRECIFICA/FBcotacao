export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ erro: 'Metodo nao permitido' }); return; }

  try {
    const { veiculo, pecas } = req.body;
    if (!veiculo || !pecas || pecas.length === 0) {
      res.status(400).json({ erro: 'Veiculo e pecas sao obrigatorios' });
      return;
    }

    const chave = (process.env.OPENAI_KEY || '').replace(/\s/g, '');
    if (!chave || chave.length < 10) {
      res.status(500).json({ erro: 'Chave OpenAI nao configurada' });
      return;
    }

    const prompt = `Você é um especialista em cotação de peças automotivas no Brasil. 
Preciso que você PESQUISE AGORA no MercadoLivre Brasil (mercadolivre.com.br) os preços reais das peças abaixo.

Veículo: ${veiculo}
Peças: ${pecas.map((p, i) => `${i+1}. ${p}`).join('\n')}

Para cada peça:
1. Busque no MercadoLivre Brasil o produto real
2. Retorne o preço atual real encontrado
3. Monte o link de busca no formato: https://lista.mercadolivre.com.br/[termo-separado-por-hifen]
4. Indique qual é a melhor opção e por quê (preço, qualidade, frete grátis)
5. Liste 2-3 opções com preços diferentes (original, nacional, genérica)

IMPORTANTE: Use preços REAIS e atuais do mercado brasileiro de 2025. Não invente preços.

Responda APENAS com JSON válido:
{
  "cotacoes": [
    {
      "peca": "nome da peça",
      "melhor": {
        "fonte": "nome do vendedor ou marca",
        "preco": "R$ 000,00",
        "link": "https://lista.mercadolivre.com.br/peca-veiculo",
        "justificativa": "motivo em 1 frase"
      },
      "opcoes": [
        {"fonte": "vendedor 2", "preco": "R$ 000,00", "link": "https://lista.mercadolivre.com.br/peca-veiculo"}
      ],
      "observacao": null
    }
  ]
}`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + chave
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é especialista em peças automotivas no Brasil. Conhece preços reais do MercadoLivre e distribuidoras. Sempre retorna JSON válido com preços realistas e links funcionais do MercadoLivre.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    const text = await openaiRes.text();
    if (!openaiRes.ok) {
      res.status(500).json({ erro: 'Erro OpenAI: ' + text.substring(0, 300) });
      return;
    }

    const data = JSON.parse(text);
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      res.status(500).json({ erro: 'Resposta vazia da IA' });
      return;
    }

    res.status(200).json(JSON.parse(content));

  } catch (erro) {
    res.status(500).json({ erro: String(erro.message || erro) });
  }
}
