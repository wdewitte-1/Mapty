'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // defined in min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // KM / hour
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// ////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetBtn = document.querySelector('.reset__app');
const deleteBtn = document.querySelector('.del__current');
const editBtn = document.querySelector('.edit__current');
const btns = document.querySelectorAll('.btns');

class App {
  #data;
  #map;
  #mapZoomLevel = 14;
  #mapEvent;
  #workouts = [];
  #markers = [];
  #workoutEl;
  #workoutIndex;

  constructor() {
    // Get user position
    this._getPosition();

    // Get data from Local Storage
    this._getLocalStorage();

    // Event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    resetBtn.addEventListener('click', this._reset);
    deleteBtn.addEventListener('click', this._deleteItem.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on the map
    this.#map.on('click', this._showForm.bind(this));

    // render workout markers from local storage
    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = function (...inputs) {
      inputs.every(inp => inp > 0);
    };

    e.preventDefault();

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        allPositive(distance, duration, cadence)
      )
        return alert('Input need to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        allPositive(distance, duration)
      )
        return alert('Input need to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add new object to workout array
    this.#workouts.push(workout);

    // render workout on map as marker
    this._renderWorkoutMarker(workout);

    // render workout on list
    this._renderWorkout(workout);

    // Hide form and clear input fields
    this._hideForm();

    // Set Local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    // custom icon
    const maptyIcon = L.icon({
      iconUrl: 'icon.png',
      iconSize: [50, 55],
      iconAnchor: [24, 3],
    });
    // create marker
    const layer = L.marker(workout.coords, { icon: maptyIcon })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    this.#markers.push(layer);
  }

  _renderWorkout(workout) {
    let html = `
    
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
              <span class="workout__icon">${
                workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
              }</span>
              <span class="workout__value">${workout.distance}</span>
              <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⏱</span>
              <span class="workout__value">${workout.duration}</span>
              <span class="workout__unit">min</span>
            </div>
      `;
    if (workout.type === 'running')
      html += `
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.pace.toFixed(1)}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
      </li> `;

    if (workout.type === 'cycling')
      html += `
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.speed.toFixed(1)}</span>
              <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
            
      </li> `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const listItems = document.querySelectorAll('.workout');

    this.#workoutEl = e.target.closest('.workout');

    if (!this.#workoutEl) {
      deleteBtn.classList.add('hidden');
      return;
    }
    const workout = this.#workouts.find(
      work => work.id === this.#workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    listItems.forEach(item => {
      if (item.classList.contains('selected__workout')) {
        item.classList.remove('selected__workout');
      }
    });

    this.#workoutEl.classList.add('selected__workout');
    console.log(btns);
    btns.forEach(b => b.classList.remove('hidden'));
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    this.#data = JSON.parse(localStorage.getItem('workouts'));

    if (!this.#data) return;

    this.#data.forEach(
      item =>
        (item.__proto__ =
          item.type === 'running' ? Running.prototype : Cycling.prototype)
    );

    this.#workouts = this.#data;

    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _deleteItem(element, workoutIndex) {
    const id = this.#workoutEl.dataset.id;
    const foundWorkout = this.#workouts.find(elem => elem.id === id);
    this.#workoutIndex = this.#workouts.indexOf(foundWorkout);

    // 1. remove from list
    this.#workoutEl.remove();

    // 2. remove from array
    this.#workouts.splice(this.#workoutIndex, 1);

    // 3. remove from map
    this.#markers[this.#workoutIndex].remove();

    // 4. remove from marker array
    this.#markers.splice(this.#workoutIndex, 1);

    this._setLocalStorage();
  }
}

const app = new App();
