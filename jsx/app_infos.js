//function getITypeIndex(types, nameS){
//    for(var i = 0; i < types.length; i++) {
//        if(types[i].name === nameS) {
//            return i;
//        }
//    }
//}

var InfoEdit = React.createClass({
    getInitialState: function() {
        var infoNew = JSON.parse( JSON.stringify( this.props.info ));
        if(Object.keys(infoNew).length === 1){
            var fields = [];
            var reviews = {};
            for (var i = 0; i < this.props.types[this.props.info.typeID].fieldNames.length; ++i) {
                fields.push("");
                reviews[i] = [];
            }
            infoNew.fields = fields;
            infoNew.reviews = reviews;
            infoNew.tags = [];
            infoNew.creationDate = moment().format();
        }
        return {
            info: infoNew
        };
    },
    componentDidMount: function(){
        //this.refs.firstTextbox.getDOMNode().focus();
    },
    componentWillUpdate: function(nextProps, nextState){
        console.log("UPDATE");
    },
    onTypeChange: function(newTypeID){
        var newInfo = JSON.parse( JSON.stringify( this.state.info ));
        newInfo.typeID = newTypeID;
        var newFieldsLength = this.props.types[newTypeID].fieldNames.length;
        var sizeDiff = newFieldsLength - this.state.info.fields.length;
        if( sizeDiff > 0 ){
            for(var i=0; i<sizeDiff; i++){
                newInfo.fields.push("");
            }
        } else if(sizeDiff < 0){
            newInfo.fields = newInfo.fields.slice(0, newFieldsLength);
        }
        this.setState({info: newInfo});
    },
    onFieldEdit: function(fieldIndex, e) {
        var newInfo = JSON.parse( JSON.stringify( this.state.info ));
        newInfo.fields[fieldIndex] = e.target.value;
        this.setState( {info: newInfo} );
    },
    onTagsEdit: function(event) {
        var newInfo = JSON.parse( JSON.stringify( this.state.info ));
        if(event.target.value === ""){
            newInfo.tags = [];
        }else{
            newInfo.tags = event.target.value.replace(/ /g, "").split(",");
        }
        this.setState( {info: newInfo} );
    },
    onSave: function(){
        this.props.onSave(this.state.info);
    },
    addUsedTag: function (nextTagStr) {
        var newInfo = JSON.parse( JSON.stringify( this.state.info ));
        newInfo.tags .push(nextTagStr);
        this.setState( {info: newInfo} );
    },
    render: function() {
        var data_elements = [];
        //var typeIndex = this.props.typeNames.indexOf(this.state.info.type);
        for (var fieldIdx = 0; fieldIdx < this.state.info.fields.length; ++fieldIdx) {
            var element_name = this.props.types[this.state.info.typeID].fieldNames[fieldIdx];
            var refStr = false;
            if(fieldIdx===0){
                refStr="firstTextbox";
            }
            data_elements.push(
                <section key={fieldIdx}>
                    <h3>Entry: {element_name}</h3>
                    <textarea
                        className="sectionContent"
                        value={this.state.info.fields[fieldIdx]}
                        ref={refStr}
                        onChange={this.onFieldEdit.bind(this, fieldIdx)}
                        rows={(this.state.info.fields[fieldIdx].match(/\n/g) || []).length+2}
                    />
                </section>
            );
        }

        // used Tags
        var usedTagEls = [];
        var seperator;
        for (var index = 0; index < this.props.usedTags.length; ++index) {
            if( this.state.info.tags.indexOf(this.props.usedTags[index]) === -1 ){
                if(usedTagEls.length===0)
                    seperator = "";
                else
                    seperator = ", ";
                usedTagEls.push(
                    <a key={index} onClick={this.addUsedTag.bind(this, this.props.usedTags[index])} href="#">{seperator+this.props.usedTags[index]}</a>
                );
            }
        }

        var isChanged = JSON.stringify(this.props.info)===JSON.stringify(this.state.info);
        return (
            <div className="InfoEdit Component">
                <div className="sectionContainer">
                    <ITypeSwitcher
                        typeNames={this.props.typeNames}
                        selectedTypeID={this.state.info.typeID}
                        onTypeChange={this.onTypeChange}
                    />
                    {data_elements}
                    <section>
                        <h3>Tags</h3>
                        <textarea
                            className="sectionContent"
                            rows={1}
                            type="text"
                            value={this.state.info.tags.join(", ")}
                            onChange={this.onTagsEdit}
                        />
                        <div className="sectionContent">
                            used: {usedTagEls}
                        </div>
                    </section>

                </div>

                <div className="flexContHoriz">
                    <span
                        className={"button buttonGood "+ (isChanged?"disabled":"")}
                        onClick={this.onSave}>{this.props.saveButtonStr}
                    </span>
                    <span className="button" onClick={this.props.cancelEdit}>Cancel</span>
                    <span className={!(this.props.onDelete)?"invisible":"" + " button buttonDanger"} onClick={this.props.onDelete}>Delete</span>
                </div>

                <div>
                </div>
            </div>);
    }
});

var ITypeSwitcher = React.createClass({
    onTypeChange: function(e){
        this.props.onTypeChange(e.target.value);
    },
    render: function() {
        var typeNameOptions = [];
        for(var typeID in this.props.typeNames){
            typeNameOptions.push( <option key={typeID} value={typeID}>{this.props.typeNames[typeID]}</option> );
        }

        return (
            <section className="sectionElement">
                <h3>Info type <span
                    className={"microbutton fa fa-plus-square"+(this.props.onAddType?"":" invisible")}
                    onClick={this.props.onAddType}>
                </span></h3>

                <select
                    className="sectionContent"
                    size={typeNameOptions.length}
                    value={this.props.selectedTypeID}
                    ref="selector"
                    onChange={this.onTypeChange}>
                    {typeNameOptions}
                </select>
            </section>);
    }
});
