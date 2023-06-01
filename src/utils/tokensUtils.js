import axios from 'axios';

export function getLocalTokens() {
	var tokens = localStorage.getItem("tokens");
	return tokens !== null ? JSON.parse(tokens) : [];
}

export function saveLocalToken(contract) {
	var tokens = localStorage.getItem("tokens");
	var tokensList = tokens !== null ? JSON.parse(tokens) : [];
	if (tokensList.includes(contract)) {
		return false;
	}
	tokensList = [...tokensList, contract];
	localStorage.setItem('tokens', JSON.stringify(tokensList));
	return true;
}

export function isTokenExist(contract) {
	var tokens = localStorage.getItem("tokens");
	var tokensList = tokens !== null ? JSON.parse(tokens) : [];
	return tokensList.includes(contract);
}

export async function fetchTokenData(contract) {
	var req = await axios.get(process.env.REACT_APP_API_URL + "/tokens/"+contract+"/info");
	return req.data;
}

export async function fetchTokensData(contracts) {
	var req = await axios.post(process.env.REACT_APP_API_URL + "/tokens/info", contracts);
	return req.data;
}