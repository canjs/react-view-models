import React from "react";
import DefineMap from "can-define/map/";
import reactViewModel from "react-view-models";
import route from "can-route";
import { routeUrl } from "can-stache/helpers/route";
import Messages from "./messages";

const AppVM = DefineMap.extend({
	page: "string",
	message: {
		type: "string",
		value: "Chat Home",
		serialize: false
	},
	addExcitement: function() {
		this.message = this.message + "!";
	}
});

const appVM = new AppVM();

route.data = appVM;
route("{page}", { page: "home" });
route.ready();

const template = reactViewModel(AppVM, (props) => (
	<div className="container">
		<div className="row">
			<div className="col-sm-8 col-sm-offset-2">
				{ props.page === "home" ? (
					<div>
						<h1
							className="page-header text-center"
							onClick={ () => props.addExcitement() }
						>{props.message}</h1>
						<a
							href={routeUrl({ page: "chat" })}
							className="btn btn-primary btn-block btn-lg"
						>Start chat</a>
					</div>
				) : (
					<Messages />
				) }
			</div>
		</div>
	</div>
));

const frag = template(appVM);
document.body.appendChild(frag);
