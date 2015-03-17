var Synth = (function () {
	"use strict";

	var keyboard = document.getElementById( 'keyboard' ),
		context = new AudioContext(),
		masterGain = context.createGain(),
		chOneOutputGain = context.createGain(),
		chSum = context.createGain(),
		Envelope,
		VCO,
		VCA,
		chOneSettings = {
			wave: 'sine',
			detune: 0
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

			chOneOutputGain.connect( chSum );
			chSum.connect( masterGain );

			masterGain.gain.value = 0.5;
			masterGain.connect( context.destination );

			keyboard.keyDown = Synth.KeyDown;



			var chOneVCO = new VCO,
				chOneVCA = new VCA,
				chOneEnvelope = new Envelope;

			chOneVCO.setType( chOneSettings.wave );
			chOneVCO.setDetune( chOneSettings.detune );

			chOneEnvelope.setAttack( 0.5 );
			chOneEnvelope.setRelease( 1 );

			chOneVCO.connect( chOneVCA );
			chOneEnvelope.connect( chOneVCA.amplitude );
			chOneVCA.connect( chOneOutputGain );

		},

		Define: {

			Concepts: function () {

				Synth.Define.VCO();
				Synth.Define.Envelope();
				Synth.Define.VCA();

			},

			VCO: function () {

				// VCO class
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
						this.oscillator.type.value = type;
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

					Envelope.prototype.trigger = function() {
						var now = context.currentTime;
						this.param.cancelScheduledValues(now);
						this.param.setValueAtTime(0, now);
						this.param.linearRampToValueAtTime(1, now + this.attackTime);
						this.param.linearRampToValueAtTime(0, now + this.attackTime + this.releaseTime);
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

		KeyDown: function (note, frequency) {
			
			Synth.Trigger( 'frequency', frequency );
			Synth.Trigger( 'gate' );

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



	






