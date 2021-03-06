var client = new Dropbox.Client({ key: "ob9346e5yc509q2" });
client.authDriver(new Dropbox.AuthDriver.Popup({receiverUrl: "https://s9w.github.io/dropbox_receiver.html"}));

var Ginseng = React.createClass({
    getInitialState() {
        return {
            infos: init_data.infos,
            infoTypes: init_data.infoTypes,
            settings: init_data.settings,
            meta: init_data.meta,

            activeMode: "status",
            selectedInfoIndex: false,
            reviewProfiles: init_data.reviewProfiles,

            dropBoxStatus: "initial",
            lastLoadedStr: "never",
            isChanged: false
        };
    },
    clickNav(mode) {
        this.setState({activeMode: mode});
    },
    authDB(){
        this.setState({dropBoxStatus: "logging in..."});
        var thisApp = this;
        client.authenticate(function (error) {
            if (error) {
                thisApp.setState({dropBoxStatus: "ERROR"});
            }
            else {
                thisApp.setState({dropBoxStatus: "loggedIn"});
            }
        });
    },
    getWriteDate(){
        var newMeta = JSON.parse( JSON.stringify( this.state.meta));
        newMeta.lastSaved = moment().format();
        var writeInfos = JSON.parse( JSON.stringify( this.state.infos));
        for(var i=0; i<writeInfos.length; i++){
            var info = writeInfos[i];
            for(var reviewKey in info.reviews)
                if(info.reviews[reviewKey].length > this.state.settings.reviewHistoryLength){
                    info.reviews[reviewKey] = info.reviews[reviewKey].slice(-2);
                }
        }
        var writeDataObj = {
            infos: writeInfos,
            infoTypes: this.state.infoTypes,
            reviewProfiles: this.state.reviewProfiles,
            settings: this.state.settings,
            meta: newMeta
        };
        var writeDataString;
        if(this.state.settings.useCompression){
            writeDataString = LZString.compressToUTF16 (JSON.stringify(writeDataObj));
        }else{
            writeDataString = JSON.stringify(writeDataObj, null, '\t');
        }
        return writeDataString;
    },
    saveLocalStorage(){
        var writeDataString = this.getWriteDate();
        localStorage.setItem("ginseng_data", writeDataString);
        var newMeta = _.cloneDeep( this.state.meta);
        newMeta.lastSaved = moment().format();
        this.setState({
            meta: newMeta,
            isChanged: false
        });
    },
    loadLocalStorage(){
        var parsedData;
        try{
            parsedData = JSON.parse(localStorage.getItem('ginseng_data'));
        }catch(e){
            parsedData = JSON.parse(LZString.decompressFromUTF16(localStorage.getItem('ginseng_data')));
        }
        this.setState({
            infos: parsedData.infos,
            infoTypes: parsedData.infoTypes,
            settings: _(this.state.settings).extend(parsedData.settings).value(),
            reviewProfiles: parsedData.reviewProfiles || this.state.reviewProfiles,
            meta: parsedData.meta,
            isChanged: false
        });
    },
    saveDB(){
        this.setState({
            dropBoxStatus: "saving"
        });
        var thisApp = this;
        var writeDataString = this.getWriteDate();

        var newMeta = _.cloneDeep( this.state.meta);
        newMeta.lastSaved = moment().format();
        client.writeFile("ginseng_data.txt", writeDataString, function(error) {
            if (error) {
                console.log("Dropbox write error: " + error);
            }
            thisApp.setState({
                meta: newMeta,
                dropBoxStatus: "loggedIn",
                isChanged: false
            });
        });
    },
    loadDB() {
        this.setState({dropBoxStatus: "loading"});
        var thisApp = this;
        client.readFile("ginseng_data.txt", function (error, data) {
            if (error) {
                console.log("Dropbox load error: " + error);
            }
            var parsedData;
            try{
                parsedData = JSON.parse(data);
            }catch(e){
                parsedData = JSON.parse(LZString.decompressFromUTF16(data));
            }

            thisApp.setState({
                infos: parsedData.infos,
                infoTypes: parsedData.infoTypes,
                settings: _(thisApp.state.settings).extend(parsedData.settings).value(),
                reviewProfiles: parsedData.reviewProfiles || thisApp.state.reviewProfiles,
                meta: parsedData.meta,
                lastLoadedStr: moment().format(),
                dropBoxStatus: "loggedIn",
                isChanged: false
            });
        });
    },
    gotoEdit(infoIndex){
        this.setState({
            selectedInfoIndex: infoIndex,
            activeMode: "edit"
        })
    },
    onInfoEdit(newInfo) {
        var newInfos = this.state.infos.slice();
        if(this.state.activeMode === "edit") {
            newInfos[this.state.selectedInfoIndex] = newInfo;
        }else{
            newInfos.push(newInfo);
        }
        this.setState({
            infos: newInfos,
            activeMode: "browse",
            isChanged: true
        } );
    },
    onInfoDelete(){
        var newInfos = JSON.parse( JSON.stringify( this.state.infos ));
        newInfos.splice(this.state.selectedInfoIndex, 1);
        this.setState({
            infos: newInfos,
            activeMode: "browse"
        } );
    },
    onTypesEdit(types, typeChanges){
        var newTypes = _.cloneDeep( types );
        var newInfos = _.cloneDeep( this.state.infos );

        if(_.keys(typeChanges).length >= 0){
            for (var infoIdx = 0; infoIdx < newInfos.length; ++infoIdx) {
                var typeID = newInfos[infoIdx].typeID;
                if(typeID in typeChanges){
                    if("entryLengthDiff" in typeChanges[typeID]){
                        if(typeChanges[typeID].entryLengthDiff > 0){
                            newInfos[infoIdx].entries = newInfos[infoIdx].entries.concat(_.times(typeChanges[typeID].entryLengthDiff, x=>""));
                        }else{
                            newInfos[infoIdx].entries.splice(newInfos[infoIdx].entries.length - Math.abs(typeChanges[typeID].entryLengthDiff), Math.abs(typeChanges[typeID].entryLengthDiff));
                        }
                    }
                    if("reviewDiff" in typeChanges[typeID]){
                        if(typeChanges[typeID].reviewDiff > 0){
                            newInfos[infoIdx].reviews = _(newTypes[typeID].templates).mapValues(x=> []).extend(newInfos[infoIdx].reviews).value();
                        }
                        else{
                            newInfos[infoIdx].reviews = _.pick(newInfos[infoIdx].reviews, _.intersection(_.keys(newInfos[infoIdx].reviews), _.keys(newTypes[typeID].templates)));
                        }
                    }
                }
            }
        }

        this.setState({
            infoTypes: newTypes,
            infos: newInfos,
            isChanged: true
        });
    },
    applyInterval(infoIndex, reviewKey, newInterval){
        var newInfos = JSON.parse( JSON.stringify( this.state.infos ));
        newInfos[infoIndex].reviews[reviewKey].push({
            "reviewTime": moment().format(),
            "dueTime": moment().add(moment.duration(newInterval)).format()
        });
        this.setState({
            infos: newInfos,
            isChanged: true
        });
    },
    getNewInfo(){
        var firstTypeID = _.min(_.keys(this.state.infoTypes));
        return {
            typeID: firstTypeID,
            entries: _.times(this.state.infoTypes[firstTypeID].entryNames.length, function(){return ""}),
            reviews: _(this.state.infoTypes[firstTypeID].templates).mapValues(template => []).value(),
            tags: [],
            creationDate: moment().format()
        }
    },
    updateGeneric(name, value){
        var newState = {
            isChanged: true
        };
        newState[name] = value;
        this.setState(newState);
    },
    render: function () {
        var infosPerType = _(this.state.infoTypes).mapValues(type => 0).value();
        for(let i=0; i<this.state.infos.length; i++){
            infosPerType[this.state.infos[i].typeID] += 1;
        }

        return (
            <div className="app">
                <NavBar
                    activeMode={this.state.activeMode}
                    isChanged={this.state.isChanged}
                    clickNav={this.clickNav}
                />
                {this.state.activeMode === "status" &&
                    <Status
                        infoCount={this.state.infos.length}
                        dropBoxStatus={this.state.dropBoxStatus}
                        onDBAuth={this.authDB}
                        onDbSave={this.saveDB}
                        onLocalSave={this.saveLocalStorage}
                        onLocalLoad={localStorage.getItem('ginseng_data')?this.loadLocalStorage:false}
                        meta={this.state.meta}
                        lastLoadedStr={this.state.lastLoadedStr}
                        onDbLoad={this.loadDB}
                        isChanged={this.state.isChanged}
                    />
                }

                {this.state.activeMode === "settings" &&
                    <Settings
                        settings={this.state.settings}
                        updateSettings={this.updateGeneric.bind(this, "settings")}
                    />
                }

                {_.contains(["new", "edit"], this.state.activeMode) &&
                    <InfoEdit
                        info={this.state.activeMode === "new"?this.getNewInfo():this.state.infos[this.state.selectedInfoIndex]}
                        onDelete={this.state.activeMode === "edit"?this.onInfoDelete:false}
                        types={this.state.infoTypes}
                        usedTags={_(this.state.infos).pluck('tags').flatten().union().value()}
                        onSave={this.onInfoEdit}
                        cancelEdit={this.clickNav.bind(this, "browse")}
                    />
                }

                {this.state.activeMode === "browse" &&
                    <InfoBrowser
                        infos={this.state.infos}
                        types={this.state.infoTypes}
                        onRowSelect={this.gotoEdit}
                        onNew={this.clickNav.bind(this, "new")}
                        selections={this.state.ginseng_selections}
                    />
                }

                {this.state.activeMode==="types" &&
                    <InfoTypes
                        types={this.state.infoTypes}
                        cancelEdit={this.clickNav.bind(this, "browse")}
                        onSave={this.onTypesEdit}
                        infosPerType={infosPerType}
                        infoCount={this.state.infos.length}
                    />
                }

                {this.state.activeMode === "profiles" &&
                    <Profiles
                        reviewProfiles={this.state.reviewProfiles}
                        updateProfiles={this.updateGeneric.bind(this, "reviewProfiles")}
                        onCancel={this.clickNav.bind(this, "browse")}
                    />
                }

                { this.state.activeMode === "review" &&
                    <ReviewInterface
                        infos={this.state.infos}
                        types={this.state.infoTypes}
                        applyInterval={this.applyInterval}
                        timeIntervalChoices={this.state.settings.timeIntervalChoices}
                        gotoEdit={this.gotoEdit}
                        profiles={this.state.reviewProfiles}
                        useGuess={this.state.settings.useGuess}
                    />
                }

            </div>
        );
    }
});

var Editor = React.createClass({
    onChange(event){
        var newDict = _.pick(this.props.path, _.pluck(this.props.objects, "key"));
        newDict[event.target.name] = event.target.value;
        this.props.onUpdate(newDict);
    },
    render() {
        var innerHtml;
        var thisOuter = this;
        return (
            <div>
                {this.props.objects.map(function (object) {
                    if (object.displayType === "label") {
                        innerHtml = <span>{thisOuter.props.path[object.key]}</span>;
                    } else if (object.displayType === "input") {
                        innerHtml = <input
                            type="text"
                            name={object.key}
                            onChange={thisOuter.onChange}
                            value={thisOuter.props.path[object.key]}
                            placeholder={object.placeholder}
                        />
                    }
                    return (
                        <section key={object.key}>
                            <h3>{object.displayName}</h3>
                            {innerHtml}
                        </section>
                    );

                })}
            </div>
        )
    }
});

React.render(
    <Ginseng />, document.getElementById('content')
);