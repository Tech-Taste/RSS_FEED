
        document.addEventListener('DOMContentLoaded', function() {
            // Estado de la aplicación
            const state = {
                feeds: [],
                currentFeed: null,
                articles: [],
                readArticles: JSON.parse(localStorage.getItem('readArticles')) || [],
                currentArticle: null,
                currentCategory: 'all'
            };

            // Elementos del DOM
            const elements = {
                feedUrl: document.getElementById('feed-url'),
                addFeedBtn: document.getElementById('add-feed-btn'),
                feedList: document.getElementById('feed-list'),
                feedCount: document.getElementById('feed-count'),
                feedHeader: document.getElementById('feed-header'),
                articleList: document.getElementById('article-list'),
                articleTitle: document.getElementById('article-title'),
                articleSource: document.getElementById('article-source'),
                articleDate: document.getElementById('article-date'),
                articleImage: document.getElementById('article-image'),
                articleText: document.getElementById('article-text'),
                markAllRead: document.getElementById('mark-all-read'),
                refreshFeeds: document.getElementById('refresh-feeds'),
                articleSearch: document.getElementById('article-search'),
                feedCategories: document.querySelectorAll('.feed-category')
            };

            // Cargar feeds guardados
            function loadFeeds() {
                const savedFeeds = localStorage.getItem('rssFeeds');
                if (savedFeeds) {
                    state.feeds = JSON.parse(savedFeeds);
                    renderFeedList();
                    updateFeedCount();
                } else {
                    // Algunos feeds por defecto
                    state.feeds = [];
                    saveFeeds();
                    renderFeedList();
                    updateFeedCount();
                }
            }

            // Guardar feeds
            function saveFeeds() {
                localStorage.setItem('rssFeeds', JSON.stringify(state.feeds));
            }

            // Eliminar feed
            function deleteFeed(url) {
                if (confirm('¿Estás seguro de querer eliminar esta suscripción?')) {
                    state.feeds = state.feeds.filter(feed => feed.url !== url);
                    
                    // Si estamos viendo el feed eliminado, borrar vista actual
                    if (state.currentFeed && state.currentFeed.url === url) {
                        state.currentFeed = null;
                        elements.feedHeader.innerHTML = `
                            <h2 class="font-semibold text-lg">Selecciona un feed</h2>
                            <p class="text-sm text-gray-500">Selecciona una fuente de la izquierda</p>
                        `;
                        elements.articleList.innerHTML = '';
                        elements.articleTitle.textContent = 'Bienvenido a Lecteur RSS';
                        elements.articleText.innerHTML = `
                            <p>Selecciona un artículo de la lista de la izquierda para leer su contenido completo.</p>
                            <p>Para comenzar, añade algunas fuentes RSS utilizando el campo en la barra lateral.</p>
                        `;
                    }
                    
                    saveFeeds();
                    renderFeedList();
                    updateFeedCount();
                }
            }

            // Guardar artículos leídos
            function saveReadArticles() {
                localStorage.setItem('readArticles', JSON.stringify(state.readArticles));
            }

            // Actualizar contador de feeds
            function updateFeedCount() {
                elements.feedCount.textContent = state.feeds.length;
            }

            // Renderizar lista de feeds
            function renderFeedList() {
                elements.feedList.innerHTML = '';
                state.feeds.forEach(feed => {
                    const li = document.createElement('li');
                    li.className = 'py-2 px-3 flex items-center rounded hover:bg-gray-700 cursor-pointer';
                    li.dataset.url = feed.url;
                    
                    const img = document.createElement('img');
                    img.src = `https://www.google.com/s2/favicons?domain=${new URL(feed.url).hostname}`;
                    img.className = 'w-4 h-4 mr-3';
                    img.alt = `Icono de ${feed.title}`;
                    
                    const span = document.createElement('span');
                    span.className = 'text-sm truncate flex-grow';
                    span.textContent = feed.title;
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'ml-2 text-red-400 hover:text-red-300';
                    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        deleteFeed(feed.url);
                    });
                    
                    li.appendChild(img);
                    li.appendChild(span);
                    li.appendChild(deleteBtn);
                    
                    // Resaltar feed seleccionado
                    if (state.currentFeed && state.currentFeed.url === feed.url) {
                        li.classList.add('bg-gray-700');
                    }
                    
                    li.addEventListener('click', () => {
                        state.currentFeed = feed;
                        renderFeedList();
                        loadArticles();
                    });
                    
                    elements.feedList.appendChild(li);
                });
            }

            // Cargar artículos de un feed
            async function loadArticles() {
                if (!state.currentFeed) return;
                
                elements.feedHeader.innerHTML = `
                    <h2 class="font-semibold text-lg">${state.currentFeed.title}</h2>
                    <p class="text-sm text-gray-500">Cargando artículos...</p>
                `;
                
                elements.articleList.innerHTML = '<div class="p-4 text-center text-gray-500">Cargando...</div>';
                
                try {
                    // Usamos un proxy CORS para evitar problemas con los feeds
                    const proxyUrl = 'https://api.rss2json.com/v1/api.json?rss_url=';
                    const response = await fetch(proxyUrl + encodeURIComponent(state.currentFeed.url));
                    const data = await response.json();
                    
                    if (data.status === 'ok') {
                        state.articles = data.items.map(item => {
                            return {
                                ...item,
                                isRead: state.readArticles.includes(item.guid || item.link)
                            };
                        });
                        
                        renderArticles();
                        updateFeedHeader();
                    } else {
                        throw new Error(data.message || 'Error al cargar el feed');
                    }
                } catch (error) {
                    console.error('Error loading feed:', error);
                    elements.feedHeader.innerHTML = `
                        <h2 class="font-semibold text-lg">${state.currentFeed.title}</h2>
                        <p class="text-sm text-red-500">Error al cargar el feed: ${error.message}</p>
                    `;
                    elements.articleList.innerHTML = '<div class="p-4 text-center text-red-500">Error al cargar los artículos</div>';
                }
            }

            // Actualizar cabecera del feed
            function updateFeedHeader() {
                const unreadCount = state.articles.filter(a => !a.isRead).length;
                elements.feedHeader.innerHTML = `
                    <h2 class="font-semibold text-lg">${state.currentFeed.title}</h2>
                    <p class="text-sm text-gray-500">
                        ${state.articles.length} artículos | ${unreadCount} no leídos
                    </p>
                `;
            }

            // Renderizar lista de artículos
            function renderArticles(filter = '') {
                elements.articleList.innerHTML = '';
                
                if (state.articles.length === 0) {
                    elements.articleList.innerHTML = '<div class="p-4 text-center text-gray-500">No hay artículos en este feed</div>';
                    return;
                }
                
                let articlesToShow = state.articles;
                
                // Aplicar filtros
                if (state.currentCategory === 'unread') {
                    articlesToShow = articlesToShow.filter(a => !a.isRead);
                }
                
                if (filter) {
                    const searchTerm = filter.toLowerCase();
                    articlesToShow = articlesToShow.filter(a => 
                        a.title.toLowerCase().includes(searchTerm) || 
                        (a.description && a.description.toLowerCase().includes(searchTerm))
                    );
                }
                
                if (articlesToShow.length === 0) {
                    elements.articleList.innerHTML = '<div class="p-4 text-center text-gray-500">No hay artículos que coincidan</div>';
                    return;
                }
                
                articlesToShow.forEach(article => {
                    const articleItem = document.createElement('div');
                    articleItem.className = `article-item p-4 border-l-4 ${article.isRead ? 'border-gray-200 read-article' : 'border-blue-500'}`;
                    articleItem.dataset.id = article.guid || article.link;
                    
                    const title = document.createElement('h3');
                    title.className = 'font-medium truncate';
                    title.textContent = article.title;
                    
                    const desc = document.createElement('p');
                    desc.className = 'text-sm text-gray-500 mt-1 line-clamp-2';
                    desc.textContent = article.description ? 
                        article.description.replace(/<[^>]*>?/gm, '').substring(0, 120) + '...' : '';
                    
                    const meta = document.createElement('div');
                    meta.className = 'flex items-center mt-2 text-xs text-gray-400';
                    
                    const date = document.createElement('span');
                    date.innerHTML = `<i class="fas fa-clock mr-1"></i>${formatDate(article.pubDate)}`;
                    
                    meta.appendChild(date);
                    
                    articleItem.appendChild(title);
                    articleItem.appendChild(desc);
                    articleItem.appendChild(meta);
                    
                    articleItem.addEventListener('click', () => {
                        showArticleContent(article);
                        if (!article.isRead) {
                            markArticleAsRead(article);
                            articleItem.classList.add('read-article');
                            articleItem.classList.remove('border-blue-500');
                            articleItem.classList.add('border-gray-200');
                        }
                    });
                    
                    elements.articleList.appendChild(articleItem);
                });
            }

            // Mostrar contenido del artículo
            function showArticleContent(article) {
                state.currentArticle = article;
                
                elements.articleTitle.textContent = article.title;
                elements.articleSource.innerHTML = `<i class="fas fa-newspaper mr-1"></i>${state.currentFeed.title}`;
                elements.articleDate.textContent = formatDate(article.pubDate);
                
                // Imagen del artículo
                let imageUrl = 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/5f83a912-becc-4b25-9603-b466d1f8a721.png';
                if (article.enclosure && article.enclosure.link) {
                    imageUrl = article.enclosure.link;
                } else if (article.thumbnail) {
                    imageUrl = article.thumbnail;
                }
                
                elements.articleImage.innerHTML = `
                    <img src="${imageUrl}" alt="${article.title}" class="w-full h-auto max-h-96 object-cover" onerror="this.src='https://placehold.co/1200x600'">
                `;
                
                // Contenido del artículo (usamos description si no hay content)
                const content = article.content || article.description || 'No hay contenido disponible';
                elements.articleText.innerHTML = content;
            }

            // Marcar artículo como leído
            function markArticleAsRead(article) {
                if (!state.readArticles.includes(article.guid || article.link)) {
                    state.readArticles.push(article.guid || article.link);
                    saveReadArticles();
                    
                    // Actualizar estado en los artículos
                    const articleIndex = state.articles.findIndex(a => 
                        (a.guid || a.link) === (article.guid || article.link));
                    if (articleIndex !== -1) {
                        state.articles[articleIndex].isRead = true;
                    }
                    
                    updateFeedHeader();
                }
            }

            // Formatear fecha
            function formatDate(dateString) {
                const date = new Date(dateString);
                return date.toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            // Event Listeners
            elements.addFeedBtn.addEventListener('click', async () => {
                const feedUrl = elements.feedUrl.value.trim();
                if (!feedUrl) return;
                
                try {
                    // Validar la URL
                    new URL(feedUrl);
                    
                    // Verificar si ya existe
                    if (state.feeds.some(f => f.url === feedUrl)) {
                        alert('Ya estás suscrito a este feed');
                        return;
                    }
                    
                    // Usar RSS2JSON para obtener información del feed
                    const proxyUrl = 'https://api.rss2json.com/v1/api.json?rss_url=';
                    const response = await fetch(proxyUrl + encodeURIComponent(feedUrl));
                    const data = await response.json();
                    
                    if (data.status === 'ok') {
                        const newFeed = {
                            url: feedUrl,
                            title: data.feed.title || new URL(feedUrl).hostname,
                            favicon: `https://www.google.com/s2/favicons?domain=${new URL(feedUrl).hostname}`
                        };
                        
                        state.feeds.push(newFeed);
                        saveFeeds();
                        renderFeedList();
                        updateFeedCount();
                        
                        elements.feedUrl.value = '';
                        
                        // Seleccionar el nuevo feed automáticamente
                        state.currentFeed = newFeed;
                        renderFeedList();
                        loadArticles();
                    } else {
                        throw new Error(data.message || 'Feed no válido');
                    }
                } catch (error) {
                    alert(`Error al agregar el feed: ${error.message}`);
                    console.error('Error adding feed:', error);
                }
            });

            elements.markAllRead.addEventListener('click', () => {
                if (!state.currentFeed) return;
                
                state.articles.forEach(article => {
                    if (!article.isRead) {
                        state.readArticles.push(article.guid || article.link);
                        article.isRead = true;
                    }
                });
                
                saveReadArticles();
                renderArticles();
                updateFeedHeader();
                
                if (state.currentArticle) {
                    showArticleContent(state.currentArticle);
                }
            });

            elements.refreshFeeds.addEventListener('click', () => {
                if (state.currentFeed) {
                    loadArticles();
                }
            });

            elements.articleSearch.addEventListener('input', (e) => {
                renderArticles(e.target.value.toLowerCase());
            });

            elements.feedCategories.forEach(category => {
                category.addEventListener('click', () => {
                    state.currentCategory = category.dataset.category;
                    elements.feedCategories.forEach(c => c.classList.remove('text-blue-300'));
                    category.classList.add('text-blue-300');
                    renderArticles();
                });
            });

            // Inicializar
            loadFeeds();

            // Seleccionar el primer feed automáticamente
            if (state.feeds.length > 0) {
                state.currentFeed = state.feeds[0];
                loadArticles();
            }
        });
