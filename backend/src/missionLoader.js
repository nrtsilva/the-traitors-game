	const fs = require('fs');
	const path = require('path');

	// Função auxiliar para carregar JSON
	const loadJSON = (filename) => {
		try {
			const filePath = path.join(__dirname, '..', 'data', filename);
			if (fs.existsSync(filePath)) {
				const content = fs.readFileSync(filePath, 'utf-8');
				if (content.trim().length > 0) {
					return JSON.parse(content);
				}
			}
		} catch (error) {
			console.error(`Erro ao ler ${filename}:`, error.message);
		}
		return [];
	};

	// Carregar todos os ficheiros
	const missoesPresenciais = loadJSON('missoes_presenciais.json');
	const missoesRemotas = loadJSON('missoes_remotas.json');
	const arsenalPresencial = loadJSON('arsenal_presencial.json');
	const arsenalRemoto = loadJSON('arsenal_remoto.json');

	// Funções de acesso
	const getMissoesPorModo = (modo) => modo === 'in_person' ? missoesPresenciais : missoesRemotas;
	const getArsenalPorModo = (modo) => modo === 'in_person' ? arsenalPresencial : arsenalRemoto;

	module.exports = {
		getMissoesPorModo,
		getArsenalPorModo,
		missoesPresenciais,
		missoesRemotas,
		arsenalPresencial,
		arsenalRemoto
	};