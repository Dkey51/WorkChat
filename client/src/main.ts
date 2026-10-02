import './styles.css';
import { store } from './model/store';
import { api } from './model/api';
import { App } from './app';

const root = document.getElementById('app');
if (!root) throw new Error('Элемент #app не найден');

// Подключаем socket-клиент к Redux store и устанавливаем соединение.
api.attach(store);
api.connect();

const app = new App(store, api);
app.mount(root);
