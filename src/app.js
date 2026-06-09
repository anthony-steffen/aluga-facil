const storageKey = "aluga-facil-properties";
const seedVersionKey = "aluga-facil-seed-version";
const seedVersion = "aparecida-goiania-v1";

const state = {
  properties: [],
  filters: {
    city: "",
    type: "",
    maxPrice: 6500,
    search: "",
  },
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const fallbackImages = [
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
];

function getInitialProperties() {
  return [
    {
      id: "demo-setor-garavelo",
      title: "Apartamento completo no Setor Garavelo",
      city: "Aparecida de Goiania",
      district: "Setor Garavelo",
      type: "Apartamento",
      price: 2100,
      bedrooms: 2,
      bathrooms: 2,
      features: ["Varanda", "Mobiliado", "Garagem"],
      image: fallbackImages[0],
      description: "Ambientes bem iluminados, condominio com portaria e acesso rapido a comercio e servicos.",
    },
    {
      id: "demo-vila-brasilia",
      title: "Casa ampla proxima ao Aparecida Shopping",
      city: "Aparecida de Goiania",
      district: "Vila Brasilia",
      type: "Casa",
      price: 2800,
      bedrooms: 3,
      bathrooms: 3,
      features: ["Quintal", "Pet friendly", "Suite"],
      image: fallbackImages[1],
      description: "Casa ventilada para familias que buscam espaco, privacidade e boa conexao com Goiania.",
    },
    {
      id: "demo-jardim-nova-era",
      title: "Studio funcional perto do Buriti Shopping",
      city: "Aparecida de Goiania",
      district: "Jardim Nova Era",
      type: "Studio",
      price: 1450,
      bedrooms: 1,
      bathrooms: 1,
      features: ["Compacto", "Elevador", "Academia"],
      image: fallbackImages[2],
      description: "Planta inteligente para rotina pratica, com transporte, comercio e servicos por perto.",
    },
  ];
}

function isLegacyDemoProperty(property) {
  const legacyTitles = new Set([
    "Apartamento completo perto da Beira Mar",
    "Casa ampla com quintal",
    "Studio funcional em area central",
  ]);
  const legacyCities = new Set(["Fortaleza", "Eusebio"]);

  return legacyTitles.has(property.title) || legacyCities.has(property.city);
}

function isCurrentDemoProperty(property) {
  return String(property.id || "").startsWith("demo-");
}

function migrateSeedProperties(savedProperties) {
  const customProperties = savedProperties.filter(
    (property) => !isLegacyDemoProperty(property) && !isCurrentDemoProperty(property),
  );

  state.properties = [...getInitialProperties(), ...customProperties];
  saveProperties();
  localStorage.setItem(seedVersionKey, seedVersion);
}

function loadProperties() {
  const saved = localStorage.getItem(storageKey);

  if (!saved) {
    state.properties = getInitialProperties();
    saveProperties();
    localStorage.setItem(seedVersionKey, seedVersion);
    return;
  }

  try {
    const savedProperties = JSON.parse(saved);
    if (!Array.isArray(savedProperties)) {
      throw new Error("Invalid saved properties");
    }

    const needsSeedMigration =
      localStorage.getItem(seedVersionKey) !== seedVersion ||
      savedProperties.some(isLegacyDemoProperty);

    if (needsSeedMigration) {
      migrateSeedProperties(savedProperties);
      return;
    }

    state.properties = savedProperties;
  } catch {
    state.properties = getInitialProperties();
    saveProperties();
    localStorage.setItem(seedVersionKey, seedVersion);
  }
}

function saveProperties() {
  localStorage.setItem(storageKey, JSON.stringify(state.properties));
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getImageUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : fallbackImages[0];
  } catch {
    return fallbackImages[0];
  }
}

function getFilteredProperties() {
  const search = normalizeText(state.filters.search);

  return state.properties.filter((property) => {
    const matchesCity = !state.filters.city || property.city === state.filters.city;
    const matchesType = !state.filters.type || property.type === state.filters.type;
    const matchesPrice = property.price <= state.filters.maxPrice;
    const searchable = normalizeText(
      `${property.title} ${property.city} ${property.district} ${property.description}`,
    );

    return matchesCity && matchesType && matchesPrice && (!search || searchable.includes(search));
  });
}

function renderStats() {
  const total = state.properties.length;
  const cities = new Set(state.properties.map((property) => property.city)).size;
  const average =
    total === 0
      ? 0
      : state.properties.reduce((sum, property) => sum + Number(property.price), 0) / total;

  document.querySelector("#stat-total").textContent = total;
  document.querySelector("#stat-cities").textContent = cities;
  document.querySelector("#stat-average").textContent = formatCurrency(average);
}

function renderCityFilter() {
  const cityFilter = document.querySelector("#city-filter");
  const selected = cityFilter.value;
  const cities = [...new Set(state.properties.map((property) => property.city))].sort();

  cityFilter.innerHTML = '<option value="">Todas</option>';
  cities.forEach((city) => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    cityFilter.append(option);
  });

  cityFilter.value = cities.includes(selected) ? selected : "";
  state.filters.city = cityFilter.value;
}

function renderTenantView() {
  const grid = document.querySelector("#property-grid");
  const filtered = getFilteredProperties();

  document.querySelector("#result-count").textContent =
    filtered.length === 1 ? "1 resultado" : `${filtered.length} resultados`;

  if (filtered.length === 0) {
    grid.innerHTML =
      '<div class="empty-state">Nenhum imovel encontrado com os filtros atuais.</div>';
    return;
  }

  grid.innerHTML = filtered
    .map(
      (property) => {
        const title = escapeHtml(property.title);
        const city = escapeHtml(property.city);
        const district = escapeHtml(property.district);
        const type = escapeHtml(property.type);
        const description = escapeHtml(property.description);

        return `
        <article class="property-card">
          <div class="property-media">
            <img src="${getImageUrl(property.image)}" alt="${title}" />
            <span class="property-badge">${type}</span>
          </div>
          <div class="property-body">
            <div>
              <h3 class="property-title">${title}</h3>
              <span class="property-location">${district}, ${city}</span>
            </div>
            <strong class="property-price">${formatCurrency(property.price)}/mes</strong>
            <div class="property-meta">
              <span class="meta-item">${property.bedrooms} quarto(s)</span>
              <span class="meta-item">${property.bathrooms} banheiro(s)</span>
            </div>
            <p class="property-description">${description}</p>
            <div class="feature-list">
              ${property.features.map((feature) => `<span class="feature-pill">${escapeHtml(feature)}</span>`).join("")}
            </div>
          </div>
        </article>
      `;
      },
    )
    .join("");
}

function renderOwnerList() {
  const ownerList = document.querySelector("#owner-list");

  if (state.properties.length === 0) {
    ownerList.innerHTML = '<div class="empty-state">Nenhum imovel cadastrado.</div>';
    return;
  }

  ownerList.innerHTML = state.properties
    .map(
      (property) => {
        const title = escapeHtml(property.title);
        const city = escapeHtml(property.city);
        const district = escapeHtml(property.district);

        return `
        <div class="owner-item">
          <div>
            <strong>${title}</strong>
            <span>${district}, ${city} - ${formatCurrency(property.price)}/mes</span>
          </div>
          <div class="owner-actions">
            <button class="small-button edit" type="button" data-edit="${property.id}">Editar</button>
            <button class="small-button delete" type="button" data-delete="${property.id}">Excluir</button>
          </div>
        </div>
      `;
      },
    )
    .join("");
}

function renderAll() {
  renderStats();
  renderCityFilter();
  renderTenantView();
  renderOwnerList();
}

function clearForm() {
  document.querySelector("#property-form").reset();
  document.querySelector("#property-id").value = "";
  document.querySelector("#bedrooms-input").value = 2;
  document.querySelector("#bathrooms-input").value = 1;
}

function getFormData() {
  return {
    id: document.querySelector("#property-id").value || crypto.randomUUID(),
    title: document.querySelector("#title-input").value.trim(),
    city: document.querySelector("#city-input").value.trim(),
    district: document.querySelector("#district-input").value.trim(),
    type: document.querySelector("#type-input").value,
    price: Number(document.querySelector("#price-input").value),
    bedrooms: Number(document.querySelector("#bedrooms-input").value),
    bathrooms: Number(document.querySelector("#bathrooms-input").value),
    features: document
      .querySelector("#features-input")
      .value.split(",")
      .map((feature) => feature.trim())
      .filter(Boolean),
    image: document.querySelector("#image-input").value.trim() || fallbackImages[0],
    description: document.querySelector("#description-input").value.trim(),
  };
}

function fillForm(property) {
  document.querySelector("#property-id").value = property.id;
  document.querySelector("#title-input").value = property.title;
  document.querySelector("#city-input").value = property.city;
  document.querySelector("#district-input").value = property.district;
  document.querySelector("#type-input").value = property.type;
  document.querySelector("#price-input").value = property.price;
  document.querySelector("#bedrooms-input").value = property.bedrooms;
  document.querySelector("#bathrooms-input").value = property.bathrooms;
  document.querySelector("#features-input").value = property.features.join(", ");
  document.querySelector("#image-input").value = property.image;
  document.querySelector("#description-input").value = property.description;
}

function setActiveView(viewName) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  document.querySelectorAll(".view-section").forEach((section) => {
    section.classList.toggle("active", section.id === `${viewName}-view`);
  });
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.view));
  });

  document.querySelector("#city-filter").addEventListener("change", (event) => {
    state.filters.city = event.target.value;
    renderTenantView();
  });

  document.querySelector("#type-filter").addEventListener("change", (event) => {
    state.filters.type = event.target.value;
    renderTenantView();
  });

  document.querySelector("#price-filter").addEventListener("input", (event) => {
    state.filters.maxPrice = Number(event.target.value);
    document.querySelector("#price-label").textContent = `ate ${formatCurrency(state.filters.maxPrice)}`;
    renderTenantView();
  });

  document.querySelector("#search-filter").addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    renderTenantView();
  });

  document.querySelector("#property-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const property = getFormData();
    const existingIndex = state.properties.findIndex((item) => item.id === property.id);

    if (existingIndex >= 0) {
      state.properties[existingIndex] = property;
    } else {
      state.properties.unshift(property);
    }

    saveProperties();
    clearForm();
    renderAll();
    setActiveView("tenant");
  });

  document.querySelector("#clear-form-button").addEventListener("click", clearForm);

  document.querySelector("#owner-list").addEventListener("click", (event) => {
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (editId) {
      const property = state.properties.find((item) => item.id === editId);
      if (property) {
        fillForm(property);
      }
    }

    if (deleteId) {
      state.properties = state.properties.filter((item) => item.id !== deleteId);
      saveProperties();
      renderAll();
    }
  });
}

loadProperties();
bindEvents();
renderAll();
