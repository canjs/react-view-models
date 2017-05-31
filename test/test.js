import QUnit from 'steal-qunit';
import React, { Component as ReactComponent } from 'react';
import PropTypes from 'prop-types';
import ReactTestUtils from 'react-dom/test-utils';
import DefineMap from 'can-define/map/map';
import CanComponent from 'can-component';
import stache from 'can-stache';

import reactViewModel, { Component, makeReactComponent } from 'react-view-model';

function getTextFromFrag(node) {
	var txt = "";
	node = node.firstChild;
	while(node) {
		if(node.nodeType === 3) {
			txt += node.nodeValue;
		} else {
			txt += getTextFromFrag(node);
		}
		node = node.nextSibling;
	}
	return txt;
}

QUnit.module('react-view-model', () => {

	QUnit.module('when extending Component', () => {

		const DefinedViewModel = DefineMap.extend('ViewModel', {
			foo: {
				type: 'string',
				value: 'foo'
			},
			bar: 'string',
			foobar: {
				get() {
					return this.foo + this.bar;
				}
			},

			zzz: {
				set( newVal ) {
					return newVal.toUpperCase();
				}
			},

			interceptedCallbackCalled: 'boolean',
			interceptedCallback: {
				type: 'function',
				get( lastSetValue ) {
					return (...args) => {
						this.interceptedCallbackCalled = true;
						if ( lastSetValue ) {
							return lastSetValue(...args);
						}
					};
				}
			}
		});

		QUnit.test('should work without a ViewModel', (assert) => {

			class TestComponent extends Component {
				render() {
					return <div>{this.props.foobar}</div>;
				}
			}

			const testInstance = ReactTestUtils.renderIntoDocument( <TestComponent foobar="foobar" /> );
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'div' );

			assert.equal(divComponent.innerText, 'foobar');

		});

		QUnit.test('should set props to be instance of ViewModel', (assert) => {
			class TestComponent extends Component {
				render() {
					return <div>{this.props.foobar}</div>;
				}
			}
			TestComponent.ViewModel = DefinedViewModel;

			const testInstance = ReactTestUtils.renderIntoDocument( <TestComponent /> );
			assert.ok( testInstance.props instanceof DefinedViewModel );
		});

		QUnit.test('should update whenever any observable property on the viewModel instance changes', (assert) => {
			class TestComponent extends Component {
				render() {
					return <div>{this.props.foobar}</div>;
				}
			}
			TestComponent.ViewModel = DefinedViewModel;

			const testInstance = ReactTestUtils.renderIntoDocument( <TestComponent bar="bar" baz="bam" /> );
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'div' );

			assert.equal(divComponent.innerText, 'foobar');
			testInstance.viewModel.foo = 'MMM';
			assert.equal(divComponent.innerText, 'MMMbar');
		});

		QUnit.test('should update whenever any observable property on the viewModel instance changes (nested)', (assert) => {
			class InnerComponent extends ReactComponent {
				render() {
					return <div>{this.props.bar.bam.quux}</div>;
				}
			}
			InnerComponent.propTypes = {
				bar: PropTypes.shape({
					bam: PropTypes.shape({
						quux: PropTypes.string.isRequired,
					}).isRequired,
				}).isRequired,
			};

			class OutterComponent extends Component {
				render() {
					return <InnerComponent bar={ this.props.foo.bar } />;
				}
			}
			OutterComponent.ViewModel = DefineMap.extend('ViewModel', {
				foo: DefineMap.extend('Foo', {
					bar: DefineMap.extend('Bar', {
						bam: DefineMap.extend('Bam', {
							quux: 'string',
						}),
					}),
				}),
			});

			const testInstance = ReactTestUtils.renderIntoDocument( <OutterComponent foo={{ bar: { bam: { quux: 'hello' } } }} /> );
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'div' );

			assert.equal(divComponent.innerText, 'hello');
			testInstance.viewModel.foo.bar.bam.quux = 'world';
			assert.equal(divComponent.innerText, 'world');
		});

		QUnit.test('should update the component when new props are received', (assert) => {
			class TestComponent extends Component {
				render() {
					return <div>{this.props.foo}</div>;
				}
			}
			TestComponent.ViewModel = DefinedViewModel;

			class WrappingComponent extends ReactComponent {
				constructor() {
					super();

					this.state = {
						barValue: 'Initial Prop Value'
					};
				}

				changeState() {
					this.setState({ barValue: 'New Prop Value' });
				}

				render() {
					return <TestComponent foo={ this.state.barValue } />;
				}
			}

			const wrappingInstance = ReactTestUtils.renderIntoDocument( <WrappingComponent /> );
			const testInstance = ReactTestUtils.scryRenderedComponentsWithType( wrappingInstance, TestComponent )[0];
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'div' );

			assert.equal(testInstance.props.foo, 'Initial Prop Value');
			assert.equal(divComponent.innerText, 'Initial Prop Value');
			wrappingInstance.changeState();
			assert.equal(testInstance.props.foo, 'New Prop Value');
			assert.equal(divComponent.innerText, 'New Prop Value');
		});

		QUnit.test('should be able to have the viewModel transform props before passing to child component', (assert) => {
			class TestComponent extends Component {
				render() {
					return <div>{this.props.zzz}</div>;
				}
			}
			TestComponent.ViewModel = DefinedViewModel;

			const testInstance = ReactTestUtils.renderIntoDocument( <TestComponent zzz="zzz" /> );
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'div' );

			assert.equal(testInstance.props.zzz, 'ZZZ');
			assert.equal(divComponent.innerText, 'ZZZ');
		});

		QUnit.test('should be able to call the props.interceptedCallback function received from parent component', (assert) => {
			class TestComponent extends Component {
				render() {
					return <div>{this.props.foobar}</div>;
				}
			}
			TestComponent.ViewModel = DefinedViewModel;

			const expectedValue = [];
			class WrappingComponent extends ReactComponent {
				parentCallBack() {
					return expectedValue;
				}

				render() {
					return <TestComponent interceptedCallback={ this.parentCallBack } />;
				}
			}

			const wrappingInstance = ReactTestUtils.renderIntoDocument( <WrappingComponent /> );
			const testInstance = ReactTestUtils.scryRenderedComponentsWithType(wrappingInstance, TestComponent)[0];

			const actual = testInstance.props.interceptedCallback();

			assert.equal(actual, expectedValue, 'Value returned from wrapping components callback successfully');
			assert.equal(testInstance.props.interceptedCallbackCalled, true, 'ViewModels interceptedCallback was called');
			testInstance.props.interceptedCallbackCalled = undefined;
		});

	});

	QUnit.module('when using reactViewModel', () => {

		QUnit.test('should work with render function', (assert) => {
			let ViewModel = DefineMap.extend('ViewModel', {
				foo: {
					type: 'string',
					value: 'foo'
				},
				bar: 'string',
				foobar: {
					get() {
						return this.foo + this.bar;
					}
				}
			});

			let first = true;
			var renderer = reactViewModel('Foobar', ViewModel, (props) => {
				if (first) {
					first = false;
					assert.ok(props instanceof ViewModel);
				}

				return <div>{ props.foobar }</div>;
			});

			var viewModel = new DefineMap({ foo: 'foo1', bar: 'bar1' });
			var frag = renderer(viewModel);

			assert.equal(getTextFromFrag(frag), 'foo1bar1');
			viewModel.foo = 'bar';
			assert.equal(getTextFromFrag(frag), 'barbar1');
		});

		QUnit.test('should work with component class extending Component', (assert) => {
			let first = true;
			class TestComponent extends Component {
				render() {
					if (first) {
						first = false;
						assert.ok(this.props instanceof TestComponent.ViewModel);
					}

					return <div>{this.props.foobar}</div>;
				}
			}
			TestComponent.ViewModel = DefineMap.extend('ViewModel', {
				foo: {
					type: 'string',
					value: 'foo'
				},
				bar: 'string',
				foobar: {
					get() {
						return this.foo + this.bar;
					}
				}
			});

			var renderer = reactViewModel(TestComponent);

			var viewModel = new DefineMap({ foo: 'foo1', bar: 'bar1' });
			var frag = renderer(viewModel);

			assert.equal(getTextFromFrag(frag), 'foo1bar1');
			viewModel.foo = 'bar';
			assert.equal(getTextFromFrag(frag), 'barbar1');
		});

		QUnit.test('should work with component class extending ReactComponent', (assert) => {
			class TestComponent extends ReactComponent {
				render() {
					return <div>{this.props.foobar}</div>;
				}
			}

			const ViewModel = DefineMap.extend('ViewModel', {
				foo: {
					type: 'string',
					value: 'foo'
				},
				bar: 'string',
				foobar: {
					get() {
						return this.foo + this.bar;
					}
				}
			});

			var renderer = reactViewModel(ViewModel, TestComponent);

			var viewModel = new DefineMap({ foo: 'foo1', bar: 'bar1' });
			var frag = renderer(viewModel);

			assert.equal(getTextFromFrag(frag), 'foo1bar1');
			viewModel.foo = 'bar';
			assert.equal(getTextFromFrag(frag), 'barbar1');
		});

	});

	QUnit.module('when using React patterns', () => {

		QUnit.test('should work with prop spread', (assert) => {

			let ViewModel = DefineMap.extend('ViewModel', {
				title: {
					type: 'string',
					value: 'Test Page',
				},
				href: {
					get() {
						return `/${this.title.toLowerCase().replace(/[^a-z]/g, '-').replace(/--+/g, '-')}`;
					},
				},
			});

			class TestComponent extends Component {
				render() {
					let props = { target: '_blank' };
					return <a {...this.props} {...props} />;
				}
			}
			TestComponent.ViewModel = ViewModel;

			const testInstance = ReactTestUtils.renderIntoDocument( <TestComponent /> );
			const aComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'a' );

			const props = {};
			for (let { name, value } of aComponent.attributes) {
				props[name] = value;
			}

			assert.equal(props.target, '_blank');
			assert.equal(props.title, 'Test Page');
			assert.equal(props.href, '/test-page');

		});

		QUnit.test('should work with prop spread (nested)', (assert) => {

			let ViewModel = DefineMap.extend('ViewModel', {
				inner: DefineMap.extend('Inner', {
					title: {
						type: 'string',
						value: 'Test Page',
					},
					href: {
						get() {
							return `/${this.title.toLowerCase().replace(/[^a-z]/g, '-').replace(/--+/g, '-')}`;
						},
					},
				}),
			});

			class TestComponent extends Component {
				render() {
					let props = { target: '_blank' };
					return <a {...this.props.inner} {...props} />;
				}
			}
			TestComponent.ViewModel = ViewModel;

			const testInstance = ReactTestUtils.renderIntoDocument( <TestComponent inner={{}} /> );
			const aComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'a' );

			const props = {};
			for (let { name, value } of aComponent.attributes) {
				props[name] = value;
			}

			assert.equal(props.target, '_blank');
			assert.equal(props.title, 'Test Page');
			assert.equal(props.href, '/test-page');

		});

	});

	QUnit.module('with CanComponent', () => {

		QUnit.test('should be able to create components', (assert) => {

			let ViewModel = DefineMap.extend('ViewModel', {
				foo: {
					type: 'string',
					value: 'foo'
				},
				bar: 'string',
				foobar: {
					get() {
						return this.foo + this.bar;
					},
				},
			});

			CanComponent.extend('CreatedComponent', {
				tag: "created-component",
				ViewModel: ViewModel,
				view: reactViewModel('TestComponent', ViewModel, (props) => {
					return (
						<div>
							<div>{props.foobar}</div>
						</div>
					);
				})
			});

			var frag = stache('<created-component bar="barrr" />')();

			assert.equal(getTextFromFrag(frag), 'foobarrr');

		});

		QUnit.test('should be able to consume components', (assert) => {

			const ConsumedComponent = makeReactComponent(
				CanComponent.extend('ConsumedComponent', {
					tag: "consumed-component",
					view: stache("<div class='inner'>{{foobar}}</div>")
				})
			);

			let ViewModel = DefineMap.extend('ViewModel', {
				foo: {
					type: 'string',
					value: 'foo'
				},
				bar: 'string',
				foobar: {
					get() {
						return this.foo + this.bar;
					}
				},
			});

			var renderer = reactViewModel(ViewModel, (props) => {
				return <ConsumedComponent foobar={props.foobar} />;
			});

			var viewModel = new DefineMap({ foo: 'foo1', bar: 'bar1' });
			var frag = renderer(viewModel);

			assert.equal(getTextFromFrag(frag), 'foo1bar1');
			viewModel.foo = 'bar';
			assert.equal(getTextFromFrag(frag), 'barbar1');

		});

	});

});
