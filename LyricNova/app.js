async function buscarLetra() {
  const artist = document.getElementById("artist").value;
  const song = document.getElementById("song").value;
  const resultado = document.getElementById("resultado");
  const loader = document.getElementById("loader");

  if (!artist || !song) {
    resultado.innerText = "Por favor completa ambos campos.";
    return;
  }

  loader.classList.remove("hidden");
  resultado.innerText = "";

  try {
    const response = await fetch(`https://api.lyrics.ovh/v1/${artist}/${song}`);
    const data = await response.json();

    if (data.lyrics) {
      resultado.innerText = data.lyrics;
    } else {
      resultado.innerText = "No se encontró la letra.";
    }
  } catch (error) {
    resultado.innerText = "Error al consultar la API.";
  }

  loader.classList.add("hidden");
}