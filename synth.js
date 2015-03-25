var Synth = (function () {
	"use strict";

	var keyboard = document.getElementById( 'keyboard' ),
		context = new AudioContext(),
		masterGain = context.createGain(),
		chOneOutputGain = context.createGain(),
		chTwoOutputGain = context.createGain(),
		chSum = context.createGain(),
		Oscillators = {},
		Voices = [],
		Envelope,
		VCO,
		VCA,
		chOneSettings = {
			wave: 'sine',
			detune: 0,
			attack: 0,
			release: 1,
			pan: 0
		},
		chTwoSettings = {
			wave: 'sine',
			detune: 10,
			attack: 0.3,
			release: 1,
			pan: 1
		},
		notes = [];

	return {

		Initialise: function () {

			// Keyboard setup and basic gain routing
			keyboard = new QwertyHancock({
				width: 600,
				height: 150,
				octaves: 2,
				startNote: 'A3'
			});

			Synth.Define.Concepts();

			//Synth.Channel.Setup( chOneOutputGain, chOneSettings );
			//Synth.Channel.Setup( chTwoOutputGain, chTwoSettings );
			
			chSum.connect( masterGain );

			masterGain.gain.value = 0.5;
			masterGain.connect( context.destination );

			keyboard.keyDown = Synth.KeyDown;
			keyboard.keyUp = Synth.KeyUp;
			
		},

		Define: {

			Concepts: function () {

				Synth.Define.VCO();
				Synth.Define.Envelope();
				Synth.Define.VCA();

			},

			VCO: function () {

				VCO = (function( context ) {
					
					function VCO() {
						
						this.oscillator = context.createOscillator();
						this.oscillator.start( 0 );

						this.input = this.oscillator;
						this.output = this.oscillator;

						var that = this;
						document.body.addEventListener( 'frequency', function ( data ) {
							that.setFrequency( data.detail );
						});

					};

					VCO.prototype.setFrequency = function( frequency ) {
						this.oscillator.frequency.setValueAtTime( frequency, context.currentTime );
					};

					VCO.prototype.setType = function( type ) {
						this.oscillator.type = type;
					};

					VCO.prototype.setDetune = function( detune ) {
						this.oscillator.detune.setValueAtTime( detune, context.currentTime );
					};

					VCO.prototype.connect = function( node ) {
						
						if ( node.hasOwnProperty( 'input' ) ) {
							this.output.connect( node.input );
						} else {
							this.output.connect( node );
						};

					}

					return VCO;
				})(context);

			},

			Envelope: function () {

				Envelope = ( function( context ) {

					function Envelope() {
						this.attackTime = 0.1;
						this.releaseTime = 0.1;
						this.sustainTime = 1;

						var that = this;
						document.body.addEventListener( 'gate', function () {
							that.trigger();
						});

					};

					Envelope.prototype.setAttack = function ( attack ) {
						this.attackTime = attack;
					};

					Envelope.prototype.setRelease = function ( release ) {
						this.releaseTime = release;
					};

					Envelope.prototype.setSustain = function ( sustain ) {
						this.sustainTime = sustain;
					};

					Envelope.prototype.trigger = function() {
						var now = context.currentTime;
						this.param.cancelScheduledValues(now);
						this.param.setValueAtTime(0, now);
						this.param.linearRampToValueAtTime(1, now + this.attackTime);
						this.param.linearRampToValueAtTime(0, now + this.attackTime + this.sustainTime + this.releaseTime);
					};

					Envelope.prototype.connect = function(param) {
						this.param = param;
					};

					return Envelope;
				})(context);

			},

			VCA: function () {

				VCA = ( function( context ) {
					function VCA() {
						this.gain = context.createGain();
						this.gain.gain.value = 0;
						this.input = this.gain;
						this.output = this.gain;
						this.amplitude = this.gain.gain;
					};

					VCA.prototype.connect = function( node ) {
						if ( node.hasOwnProperty( 'input' ) ) {
							this.output.connect( node.input );
						} else {
							this.output.connect( node );
						};
					}

					return VCA;
				})(context);

			}

		},

		Channel: {

			Setup: function ( gainContext, settings ) {

				

			},

			PlayNote: function ( frequency ) {

				Oscillators[frequency] = Synth.Channel.CreateOscillators( frequency );

			},

			StopNote: function ( frequency ) {

				Synth.Channel.StopOscillators( frequency );
				delete Oscillators[ frequency ];

			},

			CreateOscillators: function ( frequency ) {

				var CreatedOscillators = [];

				if ( chOneSettings !== undefined ) {
					CreatedOscillators.push( Synth.Channel.CreateOscillator( chOneSettings, frequency ) );
				}

				if ( chTwoSettings !== undefined ) {
					CreatedOscillators.push( Synth.Channel.CreateOscillator( chTwoSettings, frequency ) );
				}

				return CreatedOscillators;

			},

			CreateOscillator: function ( settings, frequency ) {

				var vco = new VCO,
					vca = new VCA,
					envelope = new Envelope,
					pannerGain = context.createGain(),
					panner = context.createPanner();

				vco.setType( settings.wave );
				vco.setDetune( settings.detune );
				vco.setFrequency( frequency );

				envelope.setAttack( settings.attack );
				envelope.setRelease( settings.release );

				vco.connect( vca );
				envelope.connect( vca.amplitude );
				vca.connect( pannerGain );

				panner.panningModel = 'equalpower';
				panner.setPosition( settings.pan, 0, 1 - Math.abs( settings.pan ) );

				pannerGain.connect( panner );
				panner.connect( chSum );

				envelope.trigger();

				return {
					vco: vco,
					vca: vca,
					envelope: envelope,
					panner: panner
				}

			},

			StopOscillators: function ( frequency ) {

				for ( var i = Oscillators[ frequency ].length - 1; i >= 0; i-- ) {
					Oscillators[ frequency ][ i ].vco.oscillator.stop();
				};

			}

		},

		KeyDown: function (note, frequency) {

			if ( Oscillators[ frequency ] === undefined ) {
				Synth.Channel.PlayNote( frequency );
			}

			//Synth.Trigger( 'frequency', frequency );
			//Synth.Trigger( 'gate' );

		},

		KeyUp: function ( note, frequency ) {


			if ( Oscillators[ frequency ] !== undefined ) {
				Synth.Channel.StopNote( frequency );
			}

		},

		Trigger: function ( event, data ) {

			if ( window.CustomEvent ) {
				var event = new CustomEvent( event, { detail: data } );
			} else {
				var event = document.createEvent( 'CustomEvent' );
				event.initCustomEvent( event, true, true, data );
			}

			document.body.dispatchEvent( event );

		}

		
	};
}());

window.AudioContext = window.AudioContext || window.webkitAudioContext;
Synth.Initialise();



	






