import QUnit from 'steal-qunit';
import React /*, { Component as ReactComponent } */ from 'react';
import PropTypes from 'prop-types';
import ReactTestUtils from 'react-dom/test-utils';
import DefineMap from 'can-define/map/map';
// old stealjs does not seem to handle named exports properly
const ReactComponent = React.Component;

import reactViewModel from 'react-view-model';
import Component from 'react-view-model/component';

function getTextFromElement(node) {
	var txt = "";
	node = node.firstChild;
	while(node) {
		if(node.nodeType === 3) {
			txt += node.nodeValue;
		} else {
			txt += getTextFromElement(node);
		}
		node = node.nextSibling;
	}
	return txt;
}

const supportsFunctionName = (function() {
	function foo(){}
	return foo.name === 'foo';
})();

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
					return <div>{this.viewModel.foobar}</div>;
				}
			}

			const testInstance = ReactTestUtils.renderIntoDocument( <TestComponent foobar="foobar" /> );
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'div' );

			assert.equal(divComponent.innerText, 'foobar');

		});

		QUnit.test('should set viewModel to be instance of ViewModel', (assert) => {
			class TestComponent extends Component {
				render() {
					return <div>{this.viewModel.foobar}</div>;
				}
			}
			TestComponent.ViewModel = DefinedViewModel;

			const testInstance = ReactTestUtils.renderIntoDocument( <TestComponent /> );
			assert.ok( testInstance.viewModel instanceof DefinedViewModel );
		});

		QUnit.test('should update whenever any observable property on the viewModel instance changes', (assert) => {
			class TestComponent extends Component {
				render() {
					return <div>{this.viewModel.foobar}</div>;
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
					return <InnerComponent bar={ this.viewModel.foo.bar } />;
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

		QUnit.test('should update the viewModel when new props are received', (assert) => {
			class TestComponent extends Component {
				render() {
					return <div>{this.viewModel.foo}</div>;
				}
			}
			TestComponent.ViewModel = DefinedViewModel;

			class WrappingComponent extends ReactComponent {
				constructor() {
					super();

					this.state = {
						foo: 'Initial Prop Value'
					};
				}

				changeState() {
					this.setState({ foo: 'New Prop Value' });
				}

				render() {
					return <TestComponent foo={ this.state.foo } />;
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

		QUnit.test('should not overwrite the viewModel with unchanged values when new props are received', (assert) => {
			class TestComponent extends Component {
				changeState() {
					this.viewModel.bar = 'bar1';
				}

				render() {
					return <div>{this.viewModel.foobar}</div>;
				}
			}
			TestComponent.ViewModel = DefinedViewModel;

			class WrappingComponent extends ReactComponent {
				constructor() {
					super();

					this.state = {
						foo: 'foo'
					};
				}

				changeState() {
					this.setState({ foo: 'foo1' });
				}

				render() {
					return <TestComponent foo={ this.state.foo } bar="bar" />;
				}
			}

			const wrappingInstance = ReactTestUtils.renderIntoDocument( <WrappingComponent /> );
			const testInstance = ReactTestUtils.scryRenderedComponentsWithType( wrappingInstance, TestComponent )[0];
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'div' );

			assert.equal(divComponent.innerText, 'foobar');
			testInstance.changeState();
			assert.equal(divComponent.innerText, 'foobar1');
			wrappingInstance.changeState();
			assert.equal(divComponent.innerText, 'foo1bar1');
		});

		QUnit.test('should be able to have the viewModel transform props before passing to child component', (assert) => {
			class TestComponent extends Component {
				render() {
					return <div>{this.viewModel.zzz}</div>;
				}
			}
			TestComponent.ViewModel = DefinedViewModel;

			const testInstance = ReactTestUtils.renderIntoDocument( <TestComponent zzz="zzz" /> );
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'div' );

			assert.equal(testInstance.viewModel.zzz, 'ZZZ');
			assert.equal(divComponent.innerText, 'ZZZ');
		});

		QUnit.test('should be able to call the viewModel.interceptedCallback function received from parent component', (assert) => {
			class TestComponent extends Component {
				render() {
					return <div>{this.viewModel.foobar}</div>;
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

			const actual = testInstance.viewModel.interceptedCallback();

			assert.equal(actual, expectedValue, 'Value returned from wrapping components callback successfully');
			assert.equal(testInstance.viewModel.interceptedCallbackCalled, true, 'ViewModels interceptedCallback was called');
			testInstance.viewModel.interceptedCallbackCalled = undefined;
		});

		QUnit.test('should update parent before child', (assert) => {
			var expected = [ "parent", "child1", "child2", "parent", "child1", "child2" ];

			class ChildComponent1 extends Component {
				render() {
					assert.equal("child1", expected.shift(), "child1 renderer called in the right order");
					return <div>{this.viewModel.value}</div>;
				}
			}
			ChildComponent1.ViewModel = DefineMap.extend('ChildVM', {
				value: {
					type: 'string',
					value: 'foo',
				},
			});
			class ChildComponent2 extends Component {
				render() {
					assert.equal("child2", expected.shift(), "child2 renderer called in the right order");
					return <div>{this.viewModel.value}</div>;
				}
			}
			ChildComponent2.ViewModel = DefineMap.extend('ChildVM', {
				value: {
					type: 'string',
					value: 'foo',
				},
			});

			class ParentComponent extends Component {
				render() {
					assert.equal("parent", expected.shift(), "parent renderer called in the right order");
					return (
						<div>
							<ChildComponent1 value={this.viewModel.value} />
							<ChildComponent2 value={this.viewModel.value} />
						</div>
					);
				}
			}
			ParentComponent.ViewModel = DefineMap.extend('ParentVM', {
				value: {
					type: 'string',
					value: 'bar',
				},
			});

			const viewModel = ReactTestUtils.renderIntoDocument( <ParentComponent value="foobar" /> ).viewModel;
			viewModel.value = "change";
		});

	});

	QUnit.module('when using reactViewModel', () => {

		QUnit.test('should work with displayName, ViewModel, and render function', (assert) => {
			let ViewModel = DefineMap.extend('ViewModel', {
				first: {
					type: 'string',
					value: 'Christopher'
				},
				last: 'string',
				name: {
					get() {
						return this.first + ' ' + this.last;
					}
				}
			});

			var Person = reactViewModel('Person', ViewModel, (props) => {
				return <div>{ props.name }</div>;
			});

			const testInstance = ReactTestUtils.renderIntoDocument( <Person last="Baker" /> );
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'div' );

			assert.ok(Person.prototype instanceof Component, 'returned component is an instance of Component');
			supportsFunctionName && assert.equal(Person.name, 'Person', 'returned component is properly named');
			assert.equal(getTextFromElement(divComponent), 'Christopher Baker');
			testInstance.viewModel.first = 'Yetti';
			assert.equal(getTextFromElement(divComponent), 'Yetti Baker');
		});

		QUnit.test('should work with displayName and render function', (assert) => {
			var Person = reactViewModel('Person', (props) => {
				return <div>{ props.first } { props.last }</div>;
			});

			const testInstance = ReactTestUtils.renderIntoDocument( <Person first="Christopher" last="Baker" /> );
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'div' );

			assert.ok(Person.prototype instanceof Component, 'returned component is an instance of Component');
			supportsFunctionName && assert.equal(Person.name, 'Person', 'returned component is properly named');
			assert.equal(getTextFromElement(divComponent), 'Christopher Baker');
			testInstance.viewModel.first = 'Yetti';
			assert.equal(getTextFromElement(divComponent), 'Yetti Baker');
		});

		QUnit.test('should work with ViewModel and render function', (assert) => {
			let ViewModel = DefineMap.extend('ViewModel', {
				first: {
					type: 'string',
					value: 'Christopher'
				},
				last: 'string',
				name: {
					get() {
						return this.first + ' ' + this.last;
					}
				}
			});

			var Person = reactViewModel(ViewModel, function Person(props) {
				return <div>{ props.name }</div>;
			});

			const testInstance = ReactTestUtils.renderIntoDocument( <Person last="Baker" /> );
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'div' );

			assert.ok(Person.prototype instanceof Component, 'returned component is an instance of Component');
			supportsFunctionName && assert.equal(Person.name, 'PersonWrapper', 'returned component is properly named');
			assert.equal(getTextFromElement(divComponent), 'Christopher Baker');
			testInstance.viewModel.first = 'Yetti';
			assert.equal(getTextFromElement(divComponent), 'Yetti Baker');
		});

		QUnit.test('should work with render function', (assert) => {
			var Person = reactViewModel((props) => {
				return <div>{ props.first } { props.last }</div>;
			});

			const testInstance = ReactTestUtils.renderIntoDocument( <Person first="Christopher" last="Baker" /> );
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'div' );

			assert.ok(Person.prototype instanceof Component, 'returned component is an instance of Component');
			supportsFunctionName && assert.equal(Person.name, 'ReactVMComponentWrapper', 'returned component is properly named');
			assert.equal(getTextFromElement(divComponent), 'Christopher Baker');
			testInstance.viewModel.first = 'Yetti';
			assert.equal(getTextFromElement(divComponent), 'Yetti Baker');
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
					return <a {...this.viewModel} {...props} />;
				}
			}
			TestComponent.ViewModel = ViewModel;

			const testInstance = ReactTestUtils.renderIntoDocument( <TestComponent /> );
			const aComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'a' );

			const props = {};
			for (let index = 0; index < aComponent.attributes.length; index++) {
				let { name, value } = aComponent.attributes[index];

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
					return <a {...this.viewModel.inner} {...props} />;
				}
			}
			TestComponent.ViewModel = ViewModel;

			const testInstance = ReactTestUtils.renderIntoDocument( <TestComponent inner={{}} /> );
			const aComponent = ReactTestUtils.findRenderedDOMComponentWithTag( testInstance, 'a' );

			const props = {};
			for (let index = 0; index < aComponent.attributes.length; index++) {
				let { name, value } = aComponent.attributes[index];

				props[name] = value;
			}

			assert.equal(props.target, '_blank');
			assert.equal(props.title, 'Test Page');
			assert.equal(props.href, '/test-page');

		});

		QUnit.test('should autobind viewModel methods to the viewModel (but not defined function values)', (assert) => {
			let vm;
			let BaseMap = DefineMap.extend('ViewModel', {
				unboundMethod: {
					type: 'any',
					value: function() {
						return function() {
							assert.notEqual(this, vm, `the context of defined functions are not bound`);
						};
					},
				},
				method() {
					assert.equal(this, vm, `the context of vm method calls are bound to the vm`);
				}
			});
			let ViewModel = BaseMap.extend({
				someOtherMethod() {
					return this;
				}
			});
			var Person = reactViewModel(ViewModel, (vm) => {
				return <div onClick={vm.method} onDoubleClick={vm.unboundMethod}>Adam Barrett</div>;
			});

			const testInstance = ReactTestUtils.renderIntoDocument(<Person />);
			vm = testInstance.viewModel;
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag(testInstance, 'div');
			ReactTestUtils.Simulate.click(divComponent);
			ReactTestUtils.Simulate.doubleClick(divComponent);
		});

		QUnit.test('the autobind methods feature should follow JS prototype rules, and bind only the lowest method in the proto chain', (assert) => {
			let BaseMap = DefineMap.extend({
				method(){
					return 'NO BAD';
				}
			});
			let ViewModel = BaseMap.extend({
				method() {
					return 'GOOD!';
				}
			});

			var Person = reactViewModel('AutobindCheck', ViewModel, (vm) => {
				return <div>{ vm.method() }</div>;
			});

			const testInstance = ReactTestUtils.renderIntoDocument(<Person />);
			const divComponent = ReactTestUtils.findRenderedDOMComponentWithTag(testInstance, 'div');
			assert.equal(divComponent.textContent, 'GOOD!', 'autobinding respects prototype rules');
		});

		QUnit.test('should not autobind methods again, if 2 components are using the same ViewModel class', (assert) => {
			let ViewModel = DefineMap.extend({});
			let descriptor = Object.getOwnPropertyDescriptor(ViewModel.prototype, 'setup');
			ViewModel.prototype._xx_setup = descriptor.value;

			let setupSetCount = 0;
			Object.defineProperty(ViewModel.prototype, 'setup', {
				enumerable: descriptor.enumerable,
				get() {
					return this._xx_setup;
				},
				set(setupFn) {
					if (setupFn.name === 'setUpWithAutobind') {
						setupSetCount++;
					}
					this._xx_setup = setupFn;
				},
			});

			var Rule = reactViewModel('AutobindCheckHr1', ViewModel, () => <hr />);
			var HRule = reactViewModel('AutobindCheckHr2', ViewModel, () => <hr />);

			ReactTestUtils.renderIntoDocument(
				<div>
					<Rule />
					<HRule />
				</div>
			);

			supportsFunctionName ? assert.equal(setupSetCount, 1, 'the autobind setup modifier was only called once') : assert.ok(true);
		});

	});

});
